import { DatabaseService } from '../services/database';
import { LLMService } from '../services/llm';
import { ProcessInitialDesignMessage, ProcessDesignIterationMessage } from '../models/types';

export async function processInitialDesignLocal(message: ProcessInitialDesignMessage) {
    console.log('=== processInitialDesignLocal started ===');
    console.log('Processing initial design with message:', message);
  const dbService = new DatabaseService();
  const llmService = new LLMService();

  try {
    const { initialDesignId } = message;
    await dbService.updateInitialDesignStatus(initialDesignId, 'PROCESSING');
    const initialDesign = await dbService.getInitialDesignById(initialDesignId);
    if (!initialDesign) throw new Error(`Initial design not found: ${initialDesignId}`);

    console.log('Initial design found and calling llm: generateInitialDesign', initialDesign);
    const result = await llmService.generateInitialDesign(initialDesign);

    await dbService.updateInitialDesignWithResults(
      initialDesignId,
      result.topPanelUrl, // These are base64 strings now
      result.bottomPanelUrl,
      'local'
    );

    return {
      success: true,
      initialDesignId,
      topPanelBase64: result.topPanelUrl,
      bottomPanelBase64: result.bottomPanelUrl
    };
  } catch (error: any) {
    console.error(error);
    await dbService.updateInitialDesignStatus(message.initialDesignId, 'FAILED', error.message);
    return { success: false, error: error.message };
  } finally {
    await dbService.disconnect();
  }
}

export async function processDesignIterationLocal(message: ProcessDesignIterationMessage) {
  const dbService = new DatabaseService();
  const llmService = new LLMService();

  try {
    const { designIterationId } = message;
    await dbService.updateDesignIterationStatus(designIterationId, 'PROCESSING');

    const designIteration = await dbService.getDesignIterationById(designIterationId);
    if (!designIteration) throw new Error(`Design iteration not found: ${designIterationId}`);

    const initialDesign = await dbService.getInitialDesignById(designIteration.initialDesignId);
    if (!initialDesign || !initialDesign.generatedTopPanelImageUrl || !initialDesign.generatedBottomPanelImageUrl) {
      throw new Error(`Initial design images not found`);
    }

    const result = await llmService.generateDesignIteration(designIteration, initialDesign);

    await dbService.updateDesignIterationWithResults(
      designIterationId,
      result.topPanelUrl || null,
      result.bottomPanelUrl || null,
      'local'
    );

    return {
      success: true,
      designIterationId,
      topPanelBase64: result.topPanelUrl,
      bottomPanelBase64: result.bottomPanelUrl
    };
  } catch (error: any) {
    console.error(error);
    await dbService.updateDesignIterationStatus(message.designIterationId, 'FAILED', error.message);
    return { success: false, error: error.message };
  } finally {
    await dbService.disconnect();
  }
}
