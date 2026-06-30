Reveal.initialize({
  hash: true,
  slideNumber: false,
  progress: true,
  center: false,
  width: 1280,
  height: 720,
  margin: 0.04,
  transition: 'slide',
  backgroundTransition: 'fade',
  controls: false,
  keyboard: true,
  overview: true,
  touch: true,
});

const navPrev = document.getElementById('nav-prev');
const navNext = document.getElementById('nav-next');
const navCounter = document.getElementById('nav-counter');

function updateNav() {
  const idx = Reveal.getIndices().h + 1;
  const total = Reveal.getTotalSlides();
  navCounter.textContent = idx + ' / ' + total;
  navPrev.disabled = Reveal.isFirstSlide();
  navNext.disabled = Reveal.isLastSlide();

  const slide = Reveal.getCurrentSlide();
  const viewport = document.querySelector('.reveal-viewport');
  const revealEl = document.querySelector('.reveal');
  const isHero = slide.classList.contains('title-slide') || slide.classList.contains('section-slide');

  if (isHero) {
    viewport.classList.add('hero-bg');
    revealEl.classList.remove('has-light-background');
    revealEl.classList.add('has-dark-background');
  } else {
    viewport.classList.remove('hero-bg');
    revealEl.classList.remove('has-dark-background');
    revealEl.classList.add('has-light-background');
  }
}

navPrev.addEventListener('click', function () { Reveal.prev(); });
navNext.addEventListener('click', function () { Reveal.next(); });

Reveal.on('ready', updateNav);
Reveal.on('slidechanged', updateNav);
