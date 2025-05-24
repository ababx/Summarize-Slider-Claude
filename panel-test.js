console.log("MINIMAL TEST SCRIPT LOADED")

// Test immediate execution
document.body.style.backgroundColor = "red"
console.log("Background set to red")

// Test DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded fired")
  document.body.style.backgroundColor = "green" 
  document.body.innerHTML = "<h1>TEST SCRIPT WORKING</h1><button onclick='alert(\"BUTTON WORKS\")'>TEST BUTTON</button>"
  console.log("DOM content replaced")
})

console.log("TEST SCRIPT COMPLETE")