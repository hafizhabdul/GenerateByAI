import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
    try {
        const { prompt, size = "1024x1024" } = await req.json();

        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        const apiKey = process.env.SUMOPOD_API_KEY;
        const baseURL = process.env.SUMOPOD_BASE_URL || "https://ai.sumopod.com/v1";

        if (!apiKey) {
            return NextResponse.json(
                { error: "Sumopod API Key is missing" },
                { status: 500 }
            );
        }

        const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: baseURL,
        });

        const response = await openai.images.generate({
            model: "gpt-image-1",
            prompt: prompt,
            n: 1,
            size: size,
        });

        return NextResponse.json({
            url: response.data[0].url,
        });
    } catch (error: any) {
        console.error("Image generation error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate image" },
            { status: 500 }
        );
    }
}
