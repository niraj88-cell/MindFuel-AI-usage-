const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testVersions() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);

  console.log("--- Testing v1 ---");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hi");
    console.log("v1 Success:", result.response.text().substring(0, 20));
  } catch (e) {
    console.error("v1 Failed:", e.message);
  }

  // There is no direct way to set v1beta in the constructor easily, 
  // but we can try to see if a different model works.
  console.log("\n--- Testing gemini-pro ---");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Hi");
    console.log("gemini-pro Success:", result.response.text().substring(0, 20));
  } catch (e) {
    console.error("gemini-pro Failed:", e.message);
  }
}

testVersions();
