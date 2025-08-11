import { Request, Response } from 'express';
import { validateGenerateInitialDesignRequest } from '../models/schemas';
import { DatabaseService } from '../services/database';
import { GenerateInitialDesignRequest, GenerateInitialDesignResponse, ProcessInitialDesignMessage, PromptVariableContext } from '../models/types copy';
import { Prompt } from '@prisma/client';
import { processInitialDesignLocal } from './processDesign';
import { LLMService } from '../services/llm/index';
import { error } from 'console';

export const generateInitialDesignHandler_NEW = async (req: Request, res: Response) => {
  const dbService = new DatabaseService();

  try {
    const request = req.body;
    const validationResult = validateGenerateInitialDesignRequest(request);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error,
      });
    }

    const validatedRequest = request as GenerateInitialDesignRequest;
    const llmService = new LLMService();
    const prompt = `You are an assistant that processes design inputs for a dual-poster vertical banner. 
    Your task is to analyze the raw input and return ONLY a valid JSON object for each poster (top and bottom) 
    specifying exactly which elements to include.use name of the object "top" and "bottom"

    For each poster, return:
    - includeLogo: true/false
    - includeHeadshot: true/false (top only)
    - contactValues: list of contact values (after applying the rules)
    - useInspirationImage: true/false
    - designText: (always included)

    Rules:
    - Logo: include if provided
    - Headshot: include for top only, and only if present
    - Contacts: include only if their position is ‘top’, ‘bottom’, or ‘top and bottom’, and match the current panel
    - Inspiration images: use only on bottom poster, and only if they exist
    - Do not invent any values

    Here is the input JSON:
    ${JSON.stringify(validatedRequest, null, 2)}

    Return only JSON, no extra text.`; 

    console.log("validatedRequest" , validatedRequest);
    const generatedJson = await llmService.generateJsonFromPrompt(prompt);
    console.log("generatedJson", generatedJson);
    if (!generatedJson) {
      return res.status(500).json({ success: false, error: 'First API call failed' });
    }
    
    // Fetch prompts
    let topPanelPrompt: Prompt | null = null;
    let bottomPanelPrompt: Prompt | null = null;

    if (validatedRequest.topPanelPromptId || validatedRequest.bottomPanelPromptId) {
      const promptIds = [];
      if (validatedRequest.topPanelPromptId) promptIds.push(validatedRequest.topPanelPromptId);
      if (validatedRequest.bottomPanelPromptId) promptIds.push(validatedRequest.bottomPanelPromptId);

      const specifiedPrompts = await dbService.getPromptsByIds(promptIds);
      topPanelPrompt = specifiedPrompts.find(p => p.panelPosition === 'TOP') || null;
      bottomPanelPrompt = specifiedPrompts.find(p => p.panelPosition === 'BOTTOM') || null;

      if (validatedRequest.topPanelPromptId && !topPanelPrompt) {
        return res.status(400).json({ success: false, error: `Top panel prompt with ID ${validatedRequest.topPanelPromptId} not found or inactive` });
      }
      if (validatedRequest.bottomPanelPromptId && !bottomPanelPrompt) {
        return res.status(400).json({ success: false, error: `Bottom panel prompt with ID ${validatedRequest.bottomPanelPromptId} not found or inactive` });
      }
    }

    if (!topPanelPrompt || !bottomPanelPrompt) {
      const defaultPrompts = await dbService.getDefaultPrompts();
      topPanelPrompt = topPanelPrompt || defaultPrompts.topPanel;
      bottomPanelPrompt = bottomPanelPrompt || defaultPrompts.bottomPanel;
    }
    

    const variableContextTop: PromptVariableContext = {
      businessName: validatedRequest.businessName,
      industryType: validatedRequest.industryType,
      designText: validatedRequest.designText,
      bannerSize: validatedRequest.bannerSize,
      preferences: formatPreferences(validatedRequest.preferences),
      contacts: formatContacts(validatedRequest.contacts, 'top'),
      includeLogo: generatedJson.top.includeLogo,
      includeHeadshot: generatedJson.top.includeHeadshot,
      useInspirationImage: generatedJson.top.useInspirationImage
    };

    const variableContextBottom: PromptVariableContext = {
      businessName: validatedRequest.businessName,
      industryType: validatedRequest.industryType,
      designText: validatedRequest.designText,
      bannerSize: validatedRequest.bannerSize,
      preferences: formatPreferences(validatedRequest.preferences),
      contacts: formatContacts(validatedRequest.contacts, 'bottom'),
      includeLogo: generatedJson.bottom.includeLogo,
      includeHeadshot: generatedJson.bottom.includeHeadshot,
      useInspirationImage: generatedJson.bottom.useInspirationImage
    };

    const processedTopPrompt = replacePromptVariables(topPanelPrompt!.promptTemplate, variableContextTop);
    const processedBottomPrompt = replacePromptVariables(bottomPanelPrompt!.promptTemplate, variableContextBottom);

    const initialDesign = await dbService.createInitialDesignRecord(
      validatedRequest,
      processedTopPrompt,
      processedBottomPrompt,
      topPanelPrompt!.id,
      bottomPanelPrompt!.id
    );

    // const response: GenerateInitialDesignResponse = {
    //   id: initialDesign.id,
    //   status: initialDesign.status,
    //   message: 'Initial design generation started successfully',

    // };
    // Process the initial design asynchronously
    const response = await processInitialDesignLocal({ initialDesignId: initialDesign.id, type: 'INITIAL_DESIGN' });
    return res.status(201).json({ success: true,firstCall: generatedJson, data: response });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  } finally {
    await dbService.disconnect();
  }
};

// function replacePromptVariables(template: string, context: PromptVariableContext): string {
//   return template.replace(/\{(\w+)\}/g, (_, key) => {
//     const value = (context as any)[key];
//     if (value === undefined) throw new Error(`Missing value for variable: ${key}`);
//     return value;
//   });
// }
function replacePromptVariables(template: string, context: PromptVariableContext): string {
  return template.replace(/\{(\w+\??)\}/g, (_, rawKey) => {
    const isOptional = rawKey.endsWith("?");
    const key = rawKey.replace(/\?$/, ""); // remove '?' if optional
    const value = (context as any)[key];

    if (value === undefined || value === null) {
      if (isOptional) return "";
      throw new Error(`Missing required value for variable: ${key}`);
    }

    return String(value);
  });
}

function formatPreferences(preferences: any): string {
  if (!preferences) return '';
  const parts = [];
  if (preferences.style) parts.push(`Style: ${preferences.style}`);
  if (preferences.colors?.length) parts.push(`Colors: ${preferences.colors.join(', ')}`);
  return parts.join(', ');
}

// function formatContacts(contacts: any): string {
//   if (!Array.isArray(contacts)) return '';
//   return contacts.map((c: any) => `${c.type.charAt(0).toUpperCase() + c.type.slice(1)}: ${c.value} + 'Position: ' : ${c.panel}`).join(', ');
// }

// function formatContacts(contacts: any): string {
//   if (!Array.isArray(contacts)) return '';
//   return contacts
//     .map((c: any) => {
//       const type = c.type?.charAt(0).toUpperCase() + c.type?.slice(1);
//       const value = c.value;
//       const panel = c.panel || 'top'; // default to 'top' if missing
//       return `${type}: ${value} (Position: ${panel})`;
//     })
//     .join(', ');
// }

// Send only top contacts in top prompt and bottom contacts in bottom prompt
function formatContacts(contacts: any, panelType: 'top' | 'bottom'): string {
  if (!Array.isArray(contacts)) return '';

  return contacts
    .filter((c: any) => {
      const panel = c.panel?.toLowerCase() || 'top';
      return (
        panel === panelType ||
        panel === 'top_bottom'
      );
    })
    .map((c: any) => {
      const type = c.type?.charAt(0).toUpperCase() + c.type?.slice(1);
      const value = c.value;
      const panel = c.panel || 'top';
      return `${type}: ${value} (Position: ${panel})`;
    })
    .join(', ');
}

function formatImageInputs(imageInputs: any[]): string {
  if (!Array.isArray(imageInputs)) return '';
  return imageInputs
    .map((img: any, index: number) => {
      const instruction = img.imageInstructionsForLlm || 'No instruction';
      const panel = img.panel || 'top';
      const shortUrl = img.url?.split('?')[0] || `Image #${index + 1}`;
      return `Image: ${shortUrl} (Instruction: ${instruction}, Position: ${panel})`;
    })
    .join(', ');
}
