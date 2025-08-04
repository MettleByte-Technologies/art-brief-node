import { Request, Response } from 'express';
import { validateGenerateDesignIterationRequest } from '../models/schemas';
import { DatabaseService } from '../services/database';
import { GenerateDesignIterationRequest } from '../models/types';
import { processDesignIterationLocal } from './processDesign';

export const generateDesignIteration = async (req: Request, res: Response) => {
  console.log('=== generateDesignIteration handler started ===');

  const dbService = new DatabaseService();

  try {
    const request = req.body;
    console.log('Request payload:', request);

    const validationResult = validateGenerateDesignIterationRequest(request);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error,
      });
    }

    const validatedRequest = request as GenerateDesignIterationRequest;

    // Step 1: Get initial design
    const initialDesign = await dbService.getInitialDesignById(validatedRequest.initialDesignId);
    if (!initialDesign) {
      return res.status(404).json({
        success: false,
        error: `Initial design with ID ${validatedRequest.initialDesignId} not found`,
      });
    }

    // Step 2: Validate status
    if (initialDesign.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: `Cannot iterate on design with status '${initialDesign.status}'.`,
      });
    }

    // Step 3: Check for prompts
    if (!initialDesign.topPanelPrompt || !initialDesign.bottomPanelPrompt) {
      return res.status(500).json({
        success: false,
        error: 'Initial design is missing required prompts.',
        details: {
          topPanelPrompt: initialDesign.topPanelPrompt,
          bottomPanelPrompt: initialDesign.bottomPanelPrompt,
        },
      });
    }

    // Step 4: Get next iteration number
    const nextIterationNumber = await dbService.getNextIterationNumber(validatedRequest.initialDesignId);

    // Step 5: Create design iteration record
    const designIteration = await dbService.createDesignIterationRecord(
      validatedRequest,
      initialDesign,
      nextIterationNumber
    );

    

    const response = await processDesignIterationLocal({ designIterationId: designIteration.id, type: 'DESIGN_ITERATION' });
    // Step 6: Return response (skipping SQS)
    return res.status(201).json({
      success: true,
      data: {
        id: designIteration.id,
        status: designIteration.status,
        message: 'Design iteration started successfully',
        iterationNumber: designIteration.iterationNumber,
      },
      responseData: response
    });

  } catch (error) {
    console.error('generateDesignIteration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    await dbService.disconnect();
  }
};
