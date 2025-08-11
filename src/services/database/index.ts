import { PrismaClient, Prompt } from '@prisma/client';
import { GenerateInitialDesignRequest, GenerateDesignIterationRequest } from '../../models/types';

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }


  // ======================================
  // INITIAL DESIGN FUNCTIONS
  // ======================================

  // Get default prompts for both panels
  async getDefaultPrompts(): Promise<{ topPanel: Prompt | null; bottomPanel: Prompt | null }> {
    const [topPanel, bottomPanel] = await Promise.all([
      this.prisma.prompt.findFirst({
        where: {
          panelPosition: 'TOP',
          isDefault: true,
          isActive: true,
        },
      }),
      this.prisma.prompt.findFirst({
        where: {
          panelPosition: 'BOTTOM',
          isDefault: true,
          isActive: true,
        },
      }),
    ]);

    return { topPanel, bottomPanel };
  }

  // Get specific prompt by ID
  async getPromptById(promptId: string): Promise<Prompt | null> {
    return this.prisma.prompt.findUnique({
      where: { id: promptId },
    });
  }

  // Get multiple prompts by IDs
  async getPromptsByIds(promptIds: string[]): Promise<Prompt[]> {
    return this.prisma.prompt.findMany({
      where: {
        id: { in: promptIds },
        isActive: true,
      },
    });
  }

  // Create initial design record
  async createInitialDesignRecord(
    request: GenerateInitialDesignRequest,
    topPanelPrompt: string,
    bottomPanelPrompt: string,
    topPanelPromptTemplateId?: string,
    bottomPanelPromptTemplateId?: string
  ) {
    const data = {
      userId: request.userId,
      businessName: request.businessName,
      industryType: request.industryType,
      designText: request.designText,
      bannerSize: request.bannerSize,
      preferences: request.preferences,
      imageInputs: request.imageInputs || undefined,
      contacts: request.contacts || undefined,
      topPanelPrompt,
      bottomPanelPrompt,
      topPanelPromptTemplateId,
      bottomPanelPromptTemplateId,
      status: 'PENDING',
    };

    return this.prisma.initialDesign.create({
      data,
    });
  }

  // Update initial design status
  async updateInitialDesignStatus(
    initialDesignId: string,
    status: string,
    errorMessage?: string | null
  ) {
    return this.prisma.initialDesign.update({
      where: { id: initialDesignId },
      data: {
        status,
        errorMessage: errorMessage ?? null,
      },
    });
  }

  // Update initial design with generated URLs and other completion data
  async updateInitialDesignWithResults(
    initialDesignId: string,
    topPanelUrl: string,
    bottomPanelUrl: string,
    bucket: string
  ) {
    return this.prisma.initialDesign.update({
      where: { id: initialDesignId },
      data: {
        generatedTopPanelImageUrl: topPanelUrl,
        generatedBottomPanelImageUrl: bottomPanelUrl,
        bucket: bucket,
        status: 'COMPLETED',
      },
    });
  }

  // Get initial design by ID
  async getInitialDesignById(initialDesignId: string) {
    return this.prisma.initialDesign.findUnique({
      where: { id: initialDesignId },
    });
  }

  // ======================================
  // DESIGN ITERATION FUNCTIONS
  // ======================================

  // Get the next iteration number for an initial design
  async getNextIterationNumber(initialDesignId: string): Promise<number> {
    const highestIteration = await this.prisma.designIteration.findFirst({
      where: {
        initialDesignId: initialDesignId,
      },
      orderBy: {
        iterationNumber: 'desc',
      },
      select: {
        iterationNumber: true,
      },
    });

    return (highestIteration?.iterationNumber || 0) + 1;
  }

  // Create design iteration record
  async createDesignIterationRecord(
    request: GenerateDesignIterationRequest,
    initialDesign: any, // Will be typed properly later
    iterationNumber: number
  ) {
    const data = {
      initialDesignId: request.initialDesignId,
      iterationNumber,
      topPanelIterationNotes: request.topPanelIterationNotes || null,
      bottomPanelIterationNotes: request.bottomPanelIterationNotes || null,
      
      // Copy original prompts from initial design
      originalTopPanelPrompt: initialDesign.topPanelPrompt,
      originalBottomPanelPrompt: initialDesign.bottomPanelPrompt,
      originalTopPanelPromptTemplateId: initialDesign.topPanelPromptTemplateId,
      originalBottomPanelPromptTemplateId: initialDesign.bottomPanelPromptTemplateId,
      
      status: 'PENDING',
    };

    return this.prisma.designIteration.create({
      data,
    });
  }

  // Update design iteration status
  async updateDesignIterationStatus(
    designIterationId: string,
    status: string,
    errorMessage?: string | null
  ) {
    return this.prisma.designIteration.update({
      where: { id: designIterationId },
      data: {
        status,
        errorMessage: errorMessage ?? null,
      },
    });
  }

  // Update design iteration with generated URLs and other completion data
  async updateDesignIterationWithResults(
    designIterationId: string,
    topPanelUrl: string | null,
    bottomPanelUrl: string | null,
    bucket: string
  ) {
    const updateData: any = {
      bucket: bucket,
      status: 'COMPLETED',
    };

    // Only update URLs if they were generated (not null)
    if (topPanelUrl) {
      updateData.generatedTopPanelIterationImageUrl = topPanelUrl;
    }
    if (bottomPanelUrl) {
      updateData.generatedBottomPanelIterationImageUrl = bottomPanelUrl;
    }

    return this.prisma.designIteration.update({
      where: { id: designIterationId },
      data: updateData,
    });
  }

  // Get design iteration by ID
  async getDesignIterationById(designIterationId: string) {
    return this.prisma.designIteration.findUnique({
      where: { id: designIterationId },
    });
  }

  // Get initial design with all its iterations
  async getInitialDesignWithIterations(initialDesignId: string) {
    return this.prisma.initialDesign.findUnique({
      where: { id: initialDesignId },
    });
  }

  // Get all iterations for an initial design
  async getIterationsForInitialDesign(initialDesignId: string) {
    return this.prisma.designIteration.findMany({
      where: { initialDesignId: initialDesignId },
      orderBy: { iterationNumber: 'asc' },
    });
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
  async saveJson(data: { prompt: string, generatedJson: any, createdAt: Date }) {
    // Example with Prisma
    return  this.prisma.generatedJson.create({
      data: {
        prompt: data.prompt,
        json: JSON.stringify(data.generatedJson),
        createdAt: data.createdAt
      }
    });
  }
} 