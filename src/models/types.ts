import { 
  designPreferencesSchema, 
  createPromptRequestSchema, 
  updatePromptRequestSchema, 
  listPromptsQuerySchema, 
  generateInitialDesignRequestSchema, 
  generateDesignIterationRequestSchema 
} from './schemas';
import { Prompt } from '@prisma/client';
import z from 'zod';

export type ResponseInputMessageContent =
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string; detail: "high" };

// Helper type for preferences
export type DesignPreferences = z.infer<typeof designPreferencesSchema>;

// Response type for the API
export interface ApiResponse<T> {
  statusCode: number;
  body: {
    success: boolean;
    data?: T;
    error?: string;
  };
}

// S3 upload result type
export interface S3UploadResult {
  url: string;
  key: string;
  bucket: string;
} 

// Uploaded file type
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
} 

export interface ProcessDesignMessage {
  designId: string;
  isIteration?: boolean;
  originalId?: string;
}

// ======================================
// PROMPT CRUD TYPES
// ======================================

// Prompt CRUD request types
export type CreatePromptRequest = z.infer<typeof createPromptRequestSchema>;
export type UpdatePromptRequest = z.infer<typeof updatePromptRequestSchema>;
export type ListPromptsQuery = z.infer<typeof listPromptsQuerySchema>;

// Panel position enum
export type PanelPosition = 'TOP' | 'BOTTOM';

// Prompt type is now imported directly from Prisma

// List prompts response type
export interface ListPromptsResponse {
  prompts: Prompt[];
  total: number;
  limit: number;
  offset: number;
}

// ======================================
// INITIAL DESIGN GENERATION TYPES
// ======================================

// Initial design request type (using camelCase)
export type GenerateInitialDesignRequest = z.infer<typeof generateInitialDesignRequestSchema>;

// Initial design response type
export interface GenerateInitialDesignResponse {
  id: string;
  status: string;
  message: string;
}

// SQS message for initial design processing
export interface ProcessInitialDesignMessage {
  initialDesignId: string;
  type: 'INITIAL_DESIGN';
}

// Prompt variable replacement context
export interface PromptVariableContext {
  businessName: string;
  industryType: string;
  designText: string;
  bannerSize: string;
  preferences: string;
  contacts: string;
}

export interface ImageInput {
  url: string;
  panel: "top" | "bottom";
  role: "logo" | "headshot" | "inspiration" | "extraInspiration";
  description: string; // e.g., "Use this as main logo"
}
// ======================================
// DESIGN ITERATION GENERATION TYPES
// ======================================

// Design iteration request type (using camelCase)
export type GenerateDesignIterationRequest = z.infer<typeof generateDesignIterationRequestSchema>;

// Design iteration response type
export interface GenerateDesignIterationResponse {
  id: string;
  status: string;
  message: string;
  iterationNumber: number;
}

// SQS message for design iteration processing
export interface ProcessDesignIterationMessage {
  designIterationId: string;
  type: 'DESIGN_ITERATION';
}

// ======================================
// LEGACY TYPES FOR LLM SERVICE COMPATIBILITY
// ======================================

// Keep this for backward compatibility with LLM service
export interface GenerateDesignRequest {
  user_id: number;
  business_name: string;
  design_text: string;
  preferences: { style: string; colors?: string[] };
  image_inputs?: Array<{
    url: string;
    image_instructions_for_llm: string;
    panel: "top" | "bottom";
  }>;
  contacts?: Array<{
    value: string;
    type: 'phone' | 'email' | 'website' | 'facebook' | 'instagram' | 'twitter' | 'tiktok' | 'snapchat';
    location: 'top' | 'bottom' | 'top_bottom';
  }>;
  industry_type: string;
  banner_size: string;
} 