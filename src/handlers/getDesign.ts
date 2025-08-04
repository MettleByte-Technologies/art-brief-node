import { Request, Response } from 'express';
import { DatabaseService } from '../services/database';

export const getDesignHandler = async (req: Request, res: Response) => {
  console.log('=== getDesign handler started ===');

  const dbService = new DatabaseService();

  try {
    const designId = req.params.id;
    console.log('Design ID:', designId);

    if (!designId) {
      return res.status(400).json({ success: false, error: 'Design ID is required' });
    }

    let initialDesign = await dbService.getInitialDesignById(designId);
    let requestedIterationId: string | null = null;

    if (!initialDesign) {
      const iteration = await dbService.getDesignIterationById(designId);
      if (iteration) {
        initialDesign = await dbService.getInitialDesignById(iteration.initialDesignId);
        requestedIterationId = designId;
        if (!initialDesign) {
          return res.status(500).json({
            success: false,
            error: 'Data integrity error: iteration found but parent design missing',
          });
        }
      }
    }

    if (!initialDesign) {
      return res.status(404).json({ success: false, error: 'Design not found' });
    }

    const iterations = await dbService.getIterationsForInitialDesign(initialDesign.id);

    const iterationsWithUrls = iterations.map((iteration) => ({
      id: iteration.id,
      iterationNumber: iteration.iterationNumber,
      topPanelIterationNotes: iteration.topPanelIterationNotes,
      bottomPanelIterationNotes: iteration.bottomPanelIterationNotes,
      status: iteration.status,
      errorMessage: iteration.errorMessage,
      generatedTopPanelImageUrl: iteration.generatedTopPanelIterationImageUrl,
      generatedBottomPanelImageUrl: iteration.generatedBottomPanelIterationImageUrl,
      createdAt: iteration.createdAt,
      updatedAt: iteration.updatedAt,
      isRequested: iteration.id === requestedIterationId,
    }));

    const responseData = {
      id: initialDesign.id,
      userId: initialDesign.userId,
      businessName: initialDesign.businessName,
      industryType: initialDesign.industryType,
      designText: initialDesign.designText,
      bannerSize: initialDesign.bannerSize,
      preferences: initialDesign.preferences,
      imageInputs: initialDesign.imageInputs,
      contacts: initialDesign.contacts,
      topPanelPrompt: initialDesign.topPanelPrompt,
      bottomPanelPrompt: initialDesign.bottomPanelPrompt,
      topPanelPromptTemplateId: initialDesign.topPanelPromptTemplateId,
      bottomPanelPromptTemplateId: initialDesign.bottomPanelPromptTemplateId,
      status: initialDesign.status,
      errorMessage: initialDesign.errorMessage,
      generatedTopPanelImageUrl: initialDesign.generatedTopPanelImageUrl,
      generatedBottomPanelImageUrl: initialDesign.generatedBottomPanelImageUrl,
      bucket: initialDesign.bucket,
      createdAt: initialDesign.createdAt,
      updatedAt: initialDesign.updatedAt,
      ...(requestedIterationId && {
        requestedIterationId,
        requestedAsIteration: true,
      }),
      iterations: iterationsWithUrls,
    };

    return res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    console.error('Get design failed:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  } finally {
    await dbService.disconnect();
  }
};
