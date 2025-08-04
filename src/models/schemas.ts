import { z } from 'zod';

// Helper function to validate image URLs
const isImageUrl = (url: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif'];
  const lowerUrl = url.toLowerCase();
  
  // Check for image file extensions at the end of the path (before query params)
  const urlWithoutParams = lowerUrl.split('?')[0]; // Remove query parameters
  const hasImageExtension = imageExtensions.some(ext => urlWithoutParams.endsWith(ext));
  
  return hasImageExtension;
};

// Helper schemas for nested objects
export const designPreferencesSchema = z.object({
  style: z.string().min(1, 'Style is required'),
  colors: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Colors must be valid hex codes')).optional(),
});

const ContactMethodType = z.enum([
  'phone',
  'email',
  'website',
  'facebook',
  'instagram',
  'twitter',
  'x',
  'tiktok',
  'snapchat'
]);

// ======================================
// PROMPT CRUD SCHEMAS
// ======================================

// Panel position enum
const PanelPosition = z.enum(['TOP', 'BOTTOM']);

// Create prompt request schema
export const createPromptRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
  panelPosition: PanelPosition,
  promptTemplate: z.string().min(1, 'Prompt template is required'),
  version: z.number().int().positive('Version must be a positive integer').default(1),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  createdBy: z.string().optional(),
});

// Update prompt request schema - all fields optional except ID
export const updatePromptRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less').optional(),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
  panelPosition: PanelPosition.optional(),
  promptTemplate: z.string().min(1, 'Prompt template is required').optional(),
  version: z.number().int().positive('Version must be a positive integer').optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  createdBy: z.string().optional(),
}).refine(
  (data) => {
    // At least one field must be provided for update
    return Object.values(data).some(value => value !== undefined);
  },
  {
    message: 'At least one field must be provided for update',
  }
);

// Query parameters for listing prompts
export const listPromptsQuerySchema = z.object({
  panelPosition: PanelPosition.optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  limit: z.number().int().positive().max(100).default(50).optional(),
  offset: z.number().int().min(0).default(0).optional(),
});

// Validation functions for prompt operations
export const validateCreatePromptRequest = (data: unknown) => {
  try {
    return createPromptRequestSchema.safeParse(data);
  } catch (error) {
    console.error('Create prompt validation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
};

export const validateUpdatePromptRequest = (data: unknown) => {
  try {
    return updatePromptRequestSchema.safeParse(data);
  } catch (error) {
    console.error('Update prompt validation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
};

export const validateListPromptsQuery = (query: unknown) => {
  try {
    return listPromptsQuerySchema.safeParse(query);
  } catch (error) {
    console.error('List prompts query validation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
};

// ======================================
// INITIAL DESIGN GENERATION SCHEMA
// ======================================

// Updated ImageInput schema using camelCase
const InitialDesignImageInputSchema = z.object({
  url: z.string()
    .refine(isImageUrl, 'URL must be an image URL'),
  imageInstructionsForLlm: z.string().min(1, 'Image instructions for LLM are required'),
  panel: z.enum(['top', 'bottom', 'top_bottom']),
});

// Updated Contact schema using camelCase  
const InitialDesignContactEntry = z.object({
  type: ContactMethodType,
  value: z.string().min(1, 'Contact value is required'),
  panel: z.enum(['top', 'bottom', 'top_bottom'])
});

const initialDesignContactsSchema = z.array(InitialDesignContactEntry)
  .max(8, 'Maximum of 8 contact methods allowed')
  .optional();

// Generate Initial Design request schema (camelCase)
export const generateInitialDesignRequestSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer'),
  businessName: z.string().min(1, 'Business name is required').max(100, 'Business name is too long'),
  industryType: z.string().min(1, 'Industry type is required').max(100, 'Industry type is too long'),
  designText: z.string().min(1, 'Design text is required').max(500, 'Design text is too long'),
  bannerSize: z.string().min(1, 'Banner size is required').refine(
    (val) => /^\d+[x×]\d+$/.test(val.replace(/\s+/g, '')),
    'Banner size must be in format "width×height" or "widthxheight" (e.g., "1800×600" or "1800x600")'
  ),
  preferences: designPreferencesSchema,
  imageInputs: z.array(InitialDesignImageInputSchema).optional(),
  contacts: initialDesignContactsSchema,
  
  // Optional prompt overrides
  topPanelPromptId: z.string().uuid('Top panel prompt ID must be a valid UUID').optional(),
  bottomPanelPromptId: z.string().uuid('Bottom panel prompt ID must be a valid UUID').optional(),
});

// Validation function for initial design requests
export const validateGenerateInitialDesignRequest = (data: unknown) => {
  try {
    return generateInitialDesignRequestSchema.safeParse(data);
  } catch (error) {
    console.error('Initial design validation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
};

// ======================================
// DESIGN ITERATION GENERATION SCHEMA
// ======================================

// Generate Design Iteration request schema (camelCase)
export const generateDesignIterationRequestSchema = z.object({
  initialDesignId: z.string().uuid('Initial design ID must be a valid UUID'),
  topPanelIterationNotes: z.string().min(1, 'Top panel iteration notes are required').max(1000, 'Top panel iteration notes are too long').optional(),
  bottomPanelIterationNotes: z.string().min(1, 'Bottom panel iteration notes are required').max(1000, 'Bottom panel iteration notes are too long').optional(),
}).refine(
  (data) => {
    // At least one iteration notes field must be provided
    return !!(data.topPanelIterationNotes || data.bottomPanelIterationNotes);
  },
  {
    message: 'At least one iteration notes field must be provided (topPanelIterationNotes or bottomPanelIterationNotes)',
    path: ['iterationNotes'],
  }
);

// Validation function for design iteration requests
export const validateGenerateDesignIterationRequest = (data: unknown) => {
  try {
    return generateDesignIterationRequestSchema.safeParse(data);
  } catch (error) {
    console.error('Design iteration validation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
}; 