// Add a class to the sticky case study headers
let scrollHeader = window.scrollY
const header = document.querySelector(".case-study-header")

const addClass = () => header.classList.add("pinned")
const removeClass = () => header.classList.remove("pinned")

window.addEventListener('scroll', function () {
  scrollHeader = window.scrollY;

  if (scrollHeader >= 96) { addClass() }
  else { removeClass() }

  console.log(scrollHeader)
})