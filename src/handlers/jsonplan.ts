import { Prompt } from "@prisma/client";
import { Request, Response } from "express";
import { validateGenerateInitialDesignRequest } from "../models/schemas";
import { DatabaseService } from "../services/database";
import { LLMService } from '../services/llm';
import {
  GenerateInitialDesignRequest,
  GenerateInitialDesignResponse,
  ProcessInitialDesignMessage,
  PromptVariableContext,
} from "../models/types";

export const jsonPlan = async (req: Request, res: Response) => {
  try {
    // If body is a string (because of express.text()), wrap it into { prompt }
    let prompt: string;
    if (typeof req.body === "string") {
      prompt = req.body;
    } else {
      prompt = req.body.prompt;
    }
    

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ success: false, error: "Prompt missing or invalid" });
    }

    const llmService = new LLMService();
    const generatedJson = await llmService.generateJsonFromPrompt(prompt);
    return res.status(200).json({
      success: true,
      generatedJson
    });
    // Store generatedJson in your database. Adjust table/fields as needed.
    // const databaseService = new DatabaseService();
    // const savedRecord = await databaseService.saveJson({
    //   prompt,
    //   generatedJson,
    //   createdAt: new Date()
    // });

    // return res.status(200).json({
    //   success: true,
    //   generatedJson,
    //   recordId: savedRecord?.id
    // });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
};