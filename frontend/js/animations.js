/**
 * Meal-Rescue — GSAP Animation Timelines
 * Uses GSAP 3 loaded via CDN.
 */

// Wait for GSAP to load
function waitForGSAP() {
  return new Promise((resolve) => {
    if (window.gsap) return resolve(window.gsap);
    const check = setInterval(() => {
      if (window.gsap) { clearInterval(check); resolve(window.gsap); }
    }, 50);
    setTimeout(() => { clearInterval(check); resolve(null); }, 5000);
  });
}

async function pageEnterTimeline() {
  const gsap = await waitForGSAP();
  if (!gsap) return;
  gsap.from('.page-section', {
    y: 40, opacity: 0, duration: 0.7,
    stagger: 0.15, ease: 'power3.out',
    clearProps: 'all'
  });
}

async function cardStaggerIn(selector = '.box-card') {
  const gsap = await waitForGSAP();
  if (!gsap) return;
  gsap.from(selector, {
    y: 40, opacity: 0, duration: 0.5,
    stagger: 0.08, ease: 'power2.out',
    clearProps: 'all'
  });
}

async function heroTextReveal(selector = '.hero-word') {
  const gsap = await waitForGSAP();
  if (!gsap) return;
  gsap.from(selector, {
    y: 60, opacity: 0, duration: 0.8,
    stagger: 0.12, ease: 'power3.out',
    clearProps: 'all'
  });
}

async function counterUp(element, target, duration = 2) {
  const gsap = await waitForGSAP();
  if (!gsap) return;
  const obj = { val: 0 };
  gsap.to(obj, {
    val: target, duration, ease: 'power2.out',
    onUpdate: () => {
      element.textContent = Math.round(obj.val).toLocaleString();
    }
  });
}

async function priceDropAnimation(card, newPrice) {
  const gsap = await waitForGSAP();
  if (!gsap) return;
  const priceEl = card.querySelector('.price-current');
  if (!priceEl) return;

  const tl = gsap.timeline();
  tl.to(priceEl, { y: -20, opacity: 0, duration: 0.3, ease: 'power2.in' })
    .call(() => { priceEl.textContent = formatPrice(newPrice); })
    .fromTo(priceEl, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
}

async function badgeUnlockAnimation(element) {
  const gsap = await waitForGSAP();
  if (!gsap) return;
  gsap.from(element, {
    scale: 0, rotation: -15, opacity: 0,
    duration: 0.6, ease: 'back.out(1.7)',
  });
}

async function statCountUp(selector = '.stat-value') {
  const gsap = await waitForGSAP();
  if (!gsap) return;
  document.querySelectorAll(selector).forEach(el => {
    const target = parseFloat(el.dataset.target) || 0;
    counterUp(el, target);
  });
}

// IntersectionObserver for scroll-triggered animations
function setupScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Trigger counter animation for stat values
        const counters = entry.target.querySelectorAll('.stat-value[data-target]');
        counters.forEach(el => {
          const target = parseFloat(el.dataset.target) || 0;
          counterUp(el, target);
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.animate-fade-up, .animate-scale-in').forEach(el => {
    observer.observe(el);
  });
}

document.addEventListener('DOMContentLoaded', setupScrollAnimations);
