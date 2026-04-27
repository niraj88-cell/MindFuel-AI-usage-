const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    // There is no direct listModels in the main SDK, we have to use the REST API or another way
    // But we can try a few common names
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];
    for (const m of models) {
        try {
            const model = genAI.getGenerativeModel({ model: m });
            await model.generateContent("Hi");
            console.log("SUCCESS:", m);
            return;
        } catch (e) {
            console.log("FAILED:", m, e.message.substring(0, 50));
        }
    }
  } catch (e) {
    console.error("General Error:", e.message);
  }
}

listModels();
