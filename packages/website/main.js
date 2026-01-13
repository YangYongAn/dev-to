// Copy command functionality
function copyCommand() {
  const command = document.getElementById('command').textContent
  const btn = document.querySelector('.copy-btn')

  navigator.clipboard.writeText(command).then(() => {
    btn.classList.add('copied')
    btn.querySelector('span').textContent = '已复制'

    setTimeout(() => {
      btn.classList.remove('copied')
      btn.querySelector('span').textContent = '复制'
    }, 2000)
  })
}

// Make copyCommand available globally
window.copyCommand = copyCommand

// Scroll animations
document.addEventListener('DOMContentLoaded', () => {
  // Add fade-in class to animated elements
  const animatedElements = document.querySelectorAll(
    '.pain-card, .feature-card, .scenario-card, .package-card, .step-card',
  )

  animatedElements.forEach((el) => {
    el.classList.add('fade-in')
  })

  // Intersection Observer for scroll animations
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    },
  )

  animatedElements.forEach(el => observer.observe(el))

  // Smooth scroll for navigation links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault()
      const target = document.querySelector(this.getAttribute('href'))
      if (target) {
        const navHeight = document.querySelector('.nav').offsetHeight
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        })
      }
    })
  })

  // Nav background on scroll
  const nav = document.querySelector('.nav')

  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      nav.style.background = 'rgba(10, 10, 15, 0.95)'
    }
    else {
      nav.style.background = 'rgba(10, 10, 15, 0.8)'
    }
  })
})
