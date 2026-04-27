const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testNewModel() {
  const apiKey = "AIzaSyCbvKnyz5osqYqgvHQpKgFciLBljk2jgvM";
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Hi");
    console.log("SUCCESS:", result.response.text());
  } catch (e) {
    console.error("FAILED:", e.message);
  }
}

testNewModel();
