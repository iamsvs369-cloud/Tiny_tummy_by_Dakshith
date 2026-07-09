document.addEventListener('DOMContentLoaded', () => {
	const header = document.querySelector('.site-header');
	const toggleButton = document.querySelector('.mobile-nav-toggle');
	const nav = document.querySelector('.site-nav');
	
	// Create backdrop overlay dynamically to keep HTML clean
	const overlay = document.createElement('div');
	overlay.className = 'nav-overlay';
	document.body.appendChild(overlay);
	
	function toggleMenu() {
		const isOpen = document.body.classList.toggle('nav-open');
		toggleButton.setAttribute('aria-expanded', isOpen);
	}
	
	function closeMenu() {
		document.body.classList.remove('nav-open');
		if (toggleButton) {
			toggleButton.setAttribute('aria-expanded', 'false');
		}
	}
	
	if (toggleButton) {
		// Toggle menu click
		toggleButton.addEventListener('click', toggleMenu);
	}
	
	// Close on overlay click
	overlay.addEventListener('click', closeMenu);
	
	// Close menu when navigation links are clicked (scrolls smoothly to target)
	if (nav) {
		const navLinks = nav.querySelectorAll('a');
		navLinks.forEach(link => {
			link.addEventListener('click', closeMenu);
		});
	}
	
	// Close menu on Escape key press for accessibility
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
			closeMenu();
			if (toggleButton) {
				toggleButton.focus();
			}
		}
	});

	// Shrink header on scroll
	let ticking = false;

	function handleScroll() {
		if (window.scrollY > 30) {
			header.classList.add('scrolled');
		} else {
			header.classList.remove('scrolled');
		}
		ticking = false;
	}

	window.addEventListener('scroll', () => {
		if (!ticking) {
			window.requestAnimationFrame(handleScroll);
			ticking = true;
		}
	});
	
	// Initial run in case of reload in scrolled position
	handleScroll();
});
