const { GoogleGenerativeAI } = require("@google/generative-ai");

async function findWorkingModel() {
  const apiKey = "AIzaSyCbvKnyz5osqYqgvHQpKgFciLBljk2jgvM";
  const genAI = new GoogleGenerativeAI(apiKey);

  const models = [
    "gemini-2.0-flash", 
    "gemini-2.0-flash-001", 
    "gemini-1.0-pro",
    "gemini-pro",
    "gemini-3-flash-preview"
  ];

  for (const m of models) {
    try {
      console.log(`Testing ${m}...`);
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent("Hi");
      console.log(`SUCCESS: ${m} works!`);
      return;
    } catch (e) {
      console.log(`FAILED: ${m} - ${e.message.substring(0, 100)}`);
    }
  }
}

findWorkingModel();
