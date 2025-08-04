import OpenAI from "openai"
import type { ResponseInputMessageContent } from "../../models/types"
import { InitialDesign, DesignIteration } from '@prisma/client';
import { saveBase64Image } from '../../utils/image';

export class LLMService {
  private openai: OpenAI
  private readonly VISION_MODEL = "gpt-4.1-mini"

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPEN_AI_API_KEY,
    })
  }

  // ======================================
  // NEW LLM SERVICE INTERFACE
  // ======================================

  /**
   * Generate initial design with both top and bottom panels
   */
  async generateInitialDesign(initialDesignRecord: InitialDesign): Promise<{
    topPanelUrl: string;
    bottomPanelUrl: string;
  }> {
    try {
      console.log('=== Generating Initial Design ===');
      console.log('Design ID:', initialDesignRecord.id);

      // Parse JSON fields from database
      const contacts = this.parseJsonField(initialDesignRecord.contacts);
      const imageInputs = this.parseJsonField(initialDesignRecord.imageInputs);

      console.log('Parsed contacts:', contacts.length);
      console.log('Parsed imageInputs:', imageInputs.length);

      // Filter data by panel
      const topPanelContacts = this.filterContactsByPanel(contacts, 'top');
      const bottomPanelContacts = this.filterContactsByPanel(contacts, 'bottom');
      const topPanelImages = this.filterImageInputsByPanel(imageInputs, 'top');
      const bottomPanelImages = this.filterImageInputsByPanel(imageInputs, 'bottom');

      console.log('Top panel contacts:', topPanelContacts.length);
      console.log('Bottom panel contacts:', bottomPanelContacts.length);
      console.log('Top panel images:', topPanelImages.length);
      console.log('Bottom panel images:', bottomPanelImages.length);

      // Build image input content for OpenAI
      const topPanelImageContent = this.buildImageInputContent(topPanelImages);
      const bottomPanelImageContent = this.buildImageInputContent(bottomPanelImages);

      // Step 1: Generate top panel
      console.log('Generating top panel...');
      const topPanelUrl = await this.generatePanelImage(
        initialDesignRecord.topPanelPrompt,
        topPanelImageContent
      );

      // Step 2: Generate bottom panel with top panel as reference
      console.log('Generating bottom panel with top panel reference...');
      const topPanelDataUrl = `data:image/png;base64,${topPanelUrl}`;

      // Add top panel as reference image for consistency
      const bottomPanelImageContentWithTopPanel: ResponseInputMessageContent[] = [
        {
          type: "input_text",
          text: 'This is the top panel image, pay particular attention to its design and make sure that your design is consistent with it.',
        },
        {
          type: "input_image",
          image_url: topPanelDataUrl,
          detail: "high"
        },
        ...bottomPanelImageContent,
      ];

      const bottomPanelUrl = await this.generatePanelImage(
        initialDesignRecord.bottomPanelPrompt,
        bottomPanelImageContentWithTopPanel
      );

      console.log('=== Initial Design Generation Complete ===');
      
      const topImageUrl = await saveBase64Image(topPanelUrl, 'top');
      const bottomImageUrl = await saveBase64Image(bottomPanelUrl, 'bottom');
      return {
        topPanelUrl: topImageUrl,
        bottomPanelUrl: bottomImageUrl,
      };

    } catch (error) {
      console.error("Initial design generation error:", error);
      if (error instanceof Error) {
        throw new Error(`Initial design generation failed: ${error.message}`);
      }
      throw new Error("Initial design generation failed: Unknown error");
    }
  }

  /**
   * Generate design iteration based on iteration notes
   */
  async generateDesignIteration(
  designIterationRecord: DesignIteration,
  initialDesignRecord: InitialDesign
): Promise<{
  topPanelUrl: string | null; // null if no top panel iteration requested
  bottomPanelUrl: string | null; // null if no bottom panel iteration requested
}> {
  try {
    console.log('=== Generating Design Iteration ===');
    console.log('Iteration ID:', designIterationRecord.id);
    console.log('Initial Design ID:', initialDesignRecord.id);

    const shouldRegenerateTop = !!(designIterationRecord.topPanelIterationNotes?.trim());
    const shouldRegenerateBottom = !!(designIterationRecord.bottomPanelIterationNotes?.trim());

    console.log('Regenerate top panel:', shouldRegenerateTop);
    console.log('Regenerate bottom panel:', shouldRegenerateBottom);

    if (!shouldRegenerateTop && !shouldRegenerateBottom) {
      throw new Error('No iteration notes provided for any panel');
    }

    const contacts = this.parseJsonField(initialDesignRecord.contacts);
    const imageInputs = this.parseJsonField(initialDesignRecord.imageInputs);

    const topPanelContacts = this.filterContactsByPanel(contacts, 'top');
    const bottomPanelContacts = this.filterContactsByPanel(contacts, 'bottom');
    const topPanelImages = this.filterImageInputsByPanel(imageInputs, 'top');
    const bottomPanelImages = this.filterImageInputsByPanel(imageInputs, 'bottom');

    const topPanelImageContent = this.buildImageInputContent(topPanelImages);
    const bottomPanelImageContent = this.buildImageInputContent(bottomPanelImages);

    const currentTopPanelUrl = initialDesignRecord.generatedTopPanelImageUrl;
    const currentBottomPanelUrl = initialDesignRecord.generatedBottomPanelImageUrl;

    let newTopPanelUrl: string | null = null;
    let newBottomPanelUrl: string | null = null;

    // === TOP PANEL ===
    if (shouldRegenerateTop) {
      console.log('Generating top panel iteration...');

      if (!currentTopPanelUrl) {
        throw new Error('Cannot iterate top panel: no existing top panel image found');
      }

      const combinedTopPrompt = this.buildIterationPrompt(
        designIterationRecord.originalTopPanelPrompt || '',
        designIterationRecord.topPanelIterationNotes || ''
      );

      const topIterationContent: ResponseInputMessageContent[] = [
        {
          type: "input_text",
          text: `Please modify this existing design based on the iteration request.`
        },
        {
          type: "input_image",
          image_url: currentTopPanelUrl,
          detail: "high"
        },
        ...topPanelImageContent
      ];

      const newTopPanelBase64 = await this.generatePanelImage(
        combinedTopPrompt,
        topIterationContent
      );
      newTopPanelUrl = await saveBase64Image(newTopPanelBase64, 'top');
    }

    // === BOTTOM PANEL ===
    if (shouldRegenerateBottom) {
      console.log('Generating bottom panel iteration...');

      if (!currentBottomPanelUrl) {
        throw new Error('Cannot iterate bottom panel: no existing bottom panel image found');
      }

      const combinedBottomPrompt = this.buildIterationPrompt(
        designIterationRecord.originalBottomPanelPrompt || '',
        designIterationRecord.bottomPanelIterationNotes || ''
      );

      const bottomIterationContent: ResponseInputMessageContent[] = [
        {
          type: "input_text",
          text: `Please modify this existing design based on the iteration request.`
        },
        {
          type: "input_image",
          image_url: currentBottomPanelUrl,
          detail: "high"
        }
      ];

      if (newTopPanelUrl) {
        console.log('Adding newly generated top panel for bottom panel consistency...');
        bottomIterationContent.push({
          type: "input_text",
          text: 'This is the updated top panel image, ensure your bottom panel design is consistent with it.'
        });
        bottomIterationContent.push({
          type: "input_image",
          image_url: newTopPanelUrl,
          detail: "high"
        });
      } else if (currentTopPanelUrl) {
        console.log('Adding existing top panel for bottom panel consistency...');
        bottomIterationContent.push({
          type: "input_text",
          text: 'This is the current top panel image, ensure your bottom panel design remains consistent with it.'
        });
        bottomIterationContent.push({
          type: "input_image",
          image_url: currentTopPanelUrl,
          detail: "high"
        });
      }

      bottomIterationContent.push(...bottomPanelImageContent);

      const newBottomPanelBase64 = await this.generatePanelImage(
        combinedBottomPrompt,
        bottomIterationContent
      );
      newBottomPanelUrl = await saveBase64Image(newBottomPanelBase64, 'bottom');
    }

    console.log('=== Design Iteration Generation Complete ===');
    console.log('Generated top panel:', !!newTopPanelUrl);
    console.log('Generated bottom panel:', !!newBottomPanelUrl);

    return {
      topPanelUrl: newTopPanelUrl,
      bottomPanelUrl: newBottomPanelUrl,
    };

  } catch (error) {
    console.error("Design iteration generation error:", error);
    if (error instanceof Error) {
      throw new Error(`Design iteration generation failed: ${error.message}`);
    }
    throw new Error("Design iteration generation failed: Unknown error");
  }
}

  /**
   * Build combined prompt for iterations: original prompt + iteration notes
   */
  private buildIterationPrompt(originalPrompt: string, iterationNotes: string): string {
    if (!originalPrompt.trim()) {
      return iterationNotes;
    }

    return `${originalPrompt.trim()}

ITERATION REQUEST:
${iterationNotes.trim()}

Please modify the design according to the iteration request above while maintaining the overall design principles from the original prompt.`;
  }

  // ======================================
  // UTILITY METHODS (TO BE IMPLEMENTED)
  // ======================================

  /**
   * Filter contacts by panel position
   */
  private filterContactsByPanel(contacts: any[], panel: 'top' | 'bottom'): any[] {
    if (!contacts || !Array.isArray(contacts)) {
      return [];
    }

    return contacts.filter(contact => {
      return contact.panel === panel || contact.panel === 'top_bottom';
    });
  }

  /**
   * Filter image inputs by panel position
   */
  private filterImageInputsByPanel(imageInputs: any[], panel: 'top' | 'bottom'): any[] {
    if (!imageInputs || !Array.isArray(imageInputs)) {
      return [];
    }

    return imageInputs.filter(image => {
      return image.panel === panel || image.panel === 'top_bottom';
    });
  }

  /**
   * Build image input content for OpenAI
   */
  private buildImageInputContent(images: any[]): ResponseInputMessageContent[] {
    if (!images || !Array.isArray(images)) {
      return [];
    }

    const content: ResponseInputMessageContent[] = [];

    for (const image of images) {
      // Add the image
      content.push({
        type: "input_image",
        image_url: image.url,
        detail: "high"
      });

      // Add image instructions if provided
      if (image.imageInstructionsForLlm) {
        content.push({
          type: "input_text",
          text: `Image instructions: ${image.imageInstructionsForLlm}`
        });
      }
    }

    return content;
  }

  /**
   * Extract and parse JSON data from database fields
   */
  private parseJsonField(field: any): any[] {
    if (!field) return [];

    try {
      // If it's already an array, return it
      if (Array.isArray(field)) return field;

      // If it's a string, try to parse it
      if (typeof field === 'string') return JSON.parse(field);

      // If it's an object, assume it's already parsed
      return Array.isArray(field) ? field : [];
    } catch (error) {
      console.warn('Failed to parse JSON field:', error);
      return [];
    }
  }

  /**
   * Generate a single panel image
   */
  private async generatePanelImage(
    prompt: string,
    imageInputs: ResponseInputMessageContent[],
    referenceImage?: string
  ): Promise<string> {
    try {
      console.log('Generating panel with prompt length:', prompt.length);
      console.log('Image inputs count:', imageInputs.length);

      // Build the input content for OpenAI
      const inputContent: ResponseInputMessageContent[] = [...imageInputs];

      // Add reference image if provided (for bottom panel consistency)
      if (referenceImage) {
        inputContent.unshift({
          type: "input_image",
          image_url: referenceImage,
          detail: "high"
        });
      }

      // Make the OpenAI API call
      const response = await this.openai.responses.create({
        model: this.VISION_MODEL,
        input: [
          {
            role: "system",
            content: prompt,
          },
          {
            role: "user",
            content: inputContent,
          },
        ],
        tools: [{ type: "image_generation" }],
      });

      // Extract the generated image from response
      const generatedImage = response.output
        .filter((output) => output.type === "image_generation_call")
        .map((output) => output.result)[0] || "";

      if (!generatedImage) {
        throw new Error("No image was generated by OpenAI");
      }

      console.log('Panel generated successfully, image length:', generatedImage.length);
      return generatedImage;

    } catch (error) {
      console.error("Panel generation error:", error);
      if (error instanceof Error) {
        throw new Error(`Panel generation failed: ${error.message}`);
      }
      throw new Error("Panel generation failed: Unknown error");
    }
  }
}