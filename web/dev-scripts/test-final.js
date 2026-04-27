const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testFinal() {
  const apiKey = "AIzaSyCbvKnyz5osqYqgvHQpKgFciLBljk2jgvM";
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const result = await model.generateContent("Say 'I am Gemini 3 and I am working'");
    console.log("SUCCESS:", result.response.text());
  } catch (e) {
    console.error("FAILED:", e.message);
  }
}

testFinal();
