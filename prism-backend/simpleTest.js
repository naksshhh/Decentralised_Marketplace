// Simple test script
console.log("Step 1: Starting test");

// Add a delay between steps
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Use async/await for cleaner sequential code
async function runTest() {
  try {
    console.log("Step 2: Test running");
    
    // Wait 1 second
    await delay(1000);
    
    console.log("Step 3: After 1 second delay");
    
    // Wait another second
    await delay(1000);
    
    console.log("Step 4: After 2 second delay");
    
    // Wait final second
    await delay(1000);
    
    console.log("Step 5: Test completed successfully");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the test
runTest(); 