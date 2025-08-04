import { Request, Response } from 'express';
import { validateGenerateInitialDesignRequest } from '../models/schemas';
import { DatabaseService } from '../services/database';
import { GenerateInitialDesignRequest, GenerateInitialDesignResponse, ProcessInitialDesignMessage, PromptVariableContext } from '../models/types';
import { Prompt } from '@prisma/client';
import { processInitialDesignLocal } from './processDesign';

export const generateInitialDesignHandler = async (req: Request, res: Response) => {
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

    const variableContext: PromptVariableContext = {
      businessName: validatedRequest.businessName,
      industryType: validatedRequest.industryType,
      designText: validatedRequest.designText,
      bannerSize: validatedRequest.bannerSize,
      preferences: formatPreferences(validatedRequest.preferences),
      contacts: formatContacts(validatedRequest.contacts),
      logoImageUrl: validatedRequest.imageInputs?.find(input => input.imageInstructionsForLlm === 'Use as main logo')?.url  ,
      headshotImageUrl: validatedRequest.imageInputs?.find(input => input.imageInstructionsForLlm === 'This is headshot image.')?.url,
      inspirationImage1Url: validatedRequest.imageInputs?.find(input => input.imageInstructionsForLlm === 'This is extra inspiration image 1')?.url,
      inspirationImage2Url: validatedRequest.imageInputs?.find(input => input.imageInstructionsForLlm === 'This is extra inspiration image 2')?.url,
      style: validatedRequest.preferences?.style,
      colors: validatedRequest.preferences?.colors || [],
    };

    const processedTopPrompt = replacePromptVariables(topPanelPrompt!.promptTemplate, variableContext);
    const processedBottomPrompt = replacePromptVariables(bottomPanelPrompt!.promptTemplate, variableContext);

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
    return res.status(201).json({ success: true, data: response });

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

function replacePromptVariables(template: string, context: PromptVariableContext): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = (context as any)[key];
    if (value === undefined) throw new Error(`Missing value for variable: ${key}`);
    return value;
  });
}

function formatPreferences(preferences: any): string {
  if (!preferences) return '';
  const parts = [];
  if (preferences.style) parts.push(`Style: ${preferences.style}`);
  if (preferences.colors?.length) parts.push(`Colors: ${preferences.colors.join(', ')}`);
  return parts.join(', ');
}

function formatContacts(contacts: any): string {
  if (!Array.isArray(contacts)) return '';
  return contacts.map((c: any) => `${c.type.charAt(0).toUpperCase() + c.type.slice(1)}: ${c.value}`).join(', ');
}
