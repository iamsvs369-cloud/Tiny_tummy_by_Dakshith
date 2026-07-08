/**
 * Hero Scroll Animation Handler
 * Preloads 151 frame images and draws them onto a canvas based on scroll progress.
 */

document.addEventListener('DOMContentLoaded', () => {
    const scrollContainer = document.querySelector('.hero-scroll-container');
    const canvas = document.getElementById('hero-canvas');
    const loaderOverlay = document.getElementById('hero-loader-overlay');
    const loaderProgress = document.getElementById('hero-loader-progress');
    const loaderPercentage = document.getElementById('hero-loader-percentage');

    if (!scrollContainer || !canvas) return;

    const ctx = canvas.getContext('2d');
    const totalFrames = 151;
    const images = [];
    let loadedCount = 0;
    let currentFrameIndex = 1;
    let animationFrameId = null;

    // Generate paths for all frames
    const getFramePath = (index) => {
        const paddedIndex = String(index).padStart(3, '0');
        return `assets/images/herosection/ezgif-frame-${paddedIndex}.png`;
    };

    // Set canvas dimensions based on container size
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        
        // Use devicePixelRatio for high-DPI displays
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        // Scale the context to match DPI
        ctx.scale(dpr, dpr);
        
        // Re-draw current frame
        renderNearestFrame(currentFrameIndex);
    }

    // Draw an image keeping aspect ratio (contain), cropping the top-right watermark
    function drawImageContain(ctx, img, width, height) {
        // Balanced crop margins to remove top-right watermark while keeping subject centered
        const cropX = 0.12; // Crop 12% from left and right
        const cropY = 0.08; // Crop 8% from top and bottom
        
        const sx = img.width * cropX;
        const sy = img.height * cropY;
        const sw = img.width * (1 - 2 * cropX);
        const sh = img.height * (1 - 2 * cropY);

        const imgRatio = sw / sh;
        const canvasRatio = width / height;
        
        let drawWidth, drawHeight, x, y;

        if (imgRatio > canvasRatio) {
            // Cropped area is wider than canvas relative to height
            drawWidth = width;
            drawHeight = width / imgRatio;
            x = 0;
            y = (height - drawHeight) / 2;
        } else {
            // Cropped area is taller than canvas relative to width
            drawHeight = height;
            drawWidth = height * imgRatio;
            x = (width - drawWidth) / 2;
            y = 0;
        }

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, sx, sy, sw, sh, x, y, drawWidth, drawHeight);
    }

    // Render a specific frame index
    function renderFrame(index) {
        const img = images[index];
        if (img && img.complete && img.naturalWidth !== 0) {
            const logicalWidth = canvas.width / (window.devicePixelRatio || 1);
            const logicalHeight = canvas.height / (window.devicePixelRatio || 1);
            drawImageContain(ctx, img, logicalWidth, logicalHeight);
            return true;
        }
        return false;
    }

    // Fallback search: find nearest loaded frame if target frame isn't loaded yet
    function renderNearestFrame(targetIndex) {
        if (renderFrame(targetIndex)) return;

        // Search outwards
        for (let offset = 1; offset < totalFrames; offset++) {
            const prev = targetIndex - offset;
            const next = targetIndex + offset;

            if (prev >= 1 && renderFrame(prev)) return;
            if (next <= totalFrames && renderFrame(next)) return;
        }
    }

    // Scroll handler: updates target frame index and schedules render
    function handleScroll() {
        const rect = scrollContainer.getBoundingClientRect();
        
        // Check if the element is pinning (height is significantly larger than viewport)
        const isPinning = rect.height > window.innerHeight * 1.2;
        let progress = 0;
        
        if (isPinning) {
            const scrollableDist = rect.height - window.innerHeight;
            if (scrollableDist > 0) {
                progress = -rect.top / scrollableDist;
            }
        } else {
            // Non-pinning (mobile) scroll mapping:
            // Calculate progress based on position in the viewport
            const elementHeight = rect.height;
            const elementTop = rect.top;
            const viewportHeight = window.innerHeight;
            
            // Map progress from when top enters viewport from bottom, to when bottom exits at top
            progress = (viewportHeight - elementTop) / (viewportHeight + elementHeight);
        }
        
        progress = Math.max(0, Math.min(1, progress));

        // Map progress to frame index (1 to 151)
        const targetFrameIndex = Math.max(1, Math.min(totalFrames, Math.floor(progress * (totalFrames - 1)) + 1));

        if (targetFrameIndex !== currentFrameIndex) {
            currentFrameIndex = targetFrameIndex;
            
            // Throttle rendering with requestAnimationFrame
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            animationFrameId = requestAnimationFrame(() => {
                renderNearestFrame(currentFrameIndex);
            });
        }
    }

    // Preload all frames
    function preloadImages() {
        // First load Frame 1 immediately so there's no blank screen
        const firstFrameImg = new Image();
        firstFrameImg.src = getFramePath(1);
        images[1] = firstFrameImg;

        firstFrameImg.onload = () => {
            loadedCount++;
            resizeCanvas(); // Draw initial frame
            
            // Now load all other frames
            loadRemainingFrames();
        };

        firstFrameImg.onerror = () => {
            console.error('Failed to load first frame of animation.');
            loadRemainingFrames();
        };
    }

    function loadRemainingFrames() {
        let nextIndexToLoad = 2;
        const maxConcurrency = 3;

        function loadNextFromQueue() {
            if (nextIndexToLoad > totalFrames) return;
            const index = nextIndexToLoad++;

            const img = new Image();
            img.src = getFramePath(index);
            images[index] = img;

            img.onload = () => {
                loadedCount++;
                updateLoader();
                
                // If the user hasn't scrolled but this frame was needed, render it
                if (index === currentFrameIndex) {
                    renderNearestFrame(currentFrameIndex);
                }
                
                loadNextFromQueue();
            };

            img.onerror = () => {
                // Count even errors as loaded to prevent loader getting stuck
                loadedCount++;
                updateLoader();
                console.warn(`Failed to load frame ${index}`);
                
                loadNextFromQueue();
            };
        }

        // Spawn concurrent image preloaders
        for (let c = 0; c < maxConcurrency; c++) {
            loadNextFromQueue();
        }
    }

    // Update the progress bar and percentage
    function updateLoader() {
        const percent = Math.min(100, Math.floor((loadedCount / totalFrames) * 100));
        
        if (loaderProgress) {
            loaderProgress.style.width = `${percent}%`;
        }
        if (loaderPercentage) {
            loaderPercentage.textContent = `${percent}%`;
        }

        if (loadedCount >= totalFrames) {
            // Hide the loader with a smooth transition
            setTimeout(() => {
                if (loaderOverlay) {
                    loaderOverlay.classList.add('fade-out');
                    setTimeout(() => {
                        loaderOverlay.style.display = 'none';
                    }, 500);
                }
            }, 300);
        }
    }

    // Event listeners
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Intersection Observer for Meal Cards Scroll Animation (Repeatable)
    if ('IntersectionObserver' in window) {
        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -8% 0px', // trigger slightly before card enters viewport fully
            threshold: 0.1
        };

        const mealCardObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                } else {
                    entry.target.classList.remove('animate-in'); // Reset to allow repeated animation on next scroll
                }
            });
        }, observerOptions);

        const mealCards = document.querySelectorAll('.meal-card[data-animate]');
        mealCards.forEach(card => mealCardObserver.observe(card));
    } else {
        // Fallback: animate all cards immediately if browser lacks support
        const mealCards = document.querySelectorAll('.meal-card[data-animate]');
        mealCards.forEach(card => card.classList.add('animate-in'));
    }

    // Hover Popup Lightbox Logic (Auto-close after 6 seconds)
    const hoverPopup = document.getElementById('hover-popup');
    const hoverPopupImg = document.getElementById('hover-popup-img');
    let autoCloseTimeout = null;

    if (hoverPopup && hoverPopupImg) {
        const mealCards = document.querySelectorAll('.meal-card');
        mealCards.forEach(card => {
            const img = card.querySelector('img');
            if (img) {
                card.addEventListener('mouseenter', () => {
                    // Clear any active timeout
                    if (autoCloseTimeout) {
                        clearTimeout(autoCloseTimeout);
                    }
                    
                    hoverPopupImg.src = img.src;
                    hoverPopup.classList.add('active');
                    
                    // Set a timeout to automatically close the popup after 6 seconds
                    autoCloseTimeout = setTimeout(() => {
                        hoverPopup.classList.remove('active');
                    }, 6000); // 6000ms = 6s
                });
                
                card.addEventListener('mouseleave', () => {
                    // Clear the timeout and hide immediately when cursor leaves
                    if (autoCloseTimeout) {
                        clearTimeout(autoCloseTimeout);
                    }
                    hoverPopup.classList.remove('active');
                });
            }
        });
    }

    // Intersection Observer for Dry Fruit Items Scroll Animation (Repeatable)
    if ('IntersectionObserver' in window) {
        const dryFruitObserverOptions = {
            root: null,
            rootMargin: '0px 0px -6% 0px', // trigger slightly before entering view
            threshold: 0.1
        };

        const dryFruitObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                } else {
                    entry.target.classList.remove('animate-in'); // Reset for repeated animations on next scroll
                }
            });
        }, dryFruitObserverOptions);

        const dryFruitItems = document.querySelectorAll('.dry-fruit-item[data-animate-dry]');
        dryFruitItems.forEach(item => dryFruitObserver.observe(item));
    } else {
        // Fallback: immediately show elements
        const dryFruitItems = document.querySelectorAll('.dry-fruit-item[data-animate-dry]');
        dryFruitItems.forEach(item => item.classList.add('animate-in'));
    }

    // Intersection Observer for Veggies, Fries, and Treats Scroll Animations (Repeatable)
    if ('IntersectionObserver' in window) {
        const customSectionsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                } else {
                    entry.target.classList.remove('animate-in'); // Reset for repeated scroll animations
                }
            });
        }, {
            root: null,
            rootMargin: '0px 0px 150px 0px', // Trigger slightly before entering viewport
            threshold: 0.01
        });

        const animTargets = document.querySelectorAll('[data-animate-veggie], [data-animate-fries], [data-animate-treats]');
        animTargets.forEach(target => customSectionsObserver.observe(target));

        // Gather all scroll-animated targets for the bulletproof manual scroll-check fallback
        const allScrollTargets = document.querySelectorAll(
            '.meal-card[data-animate], .dry-fruit-item[data-animate-dry], [data-animate-veggie], [data-animate-fries], [data-animate-treats]'
        );

        // Bulletproof scroll-check fallback for bottom-of-page elements
        const manualCheck = () => {
            allScrollTargets.forEach(target => {
                const rect = target.getBoundingClientRect();
                const visible = rect.top < window.innerHeight + 150 && rect.bottom > -150;
                if (visible) {
                    target.classList.add('animate-in');
                }
            });
        };
        window.addEventListener('scroll', manualCheck, { passive: true });
        window.addEventListener('resize', manualCheck, { passive: true });
        setTimeout(manualCheck, 500); // Check shortly after load when layout is stable
        setTimeout(manualCheck, 1500); // Extra check in case page takes longer to lay out
    } else {
        // Fallback: immediately show elements
        const animTargets = document.querySelectorAll(
            '.meal-card[data-animate], .dry-fruit-item[data-animate-dry], [data-animate-veggie], [data-animate-fries], [data-animate-treats]'
        );
        animTargets.forEach(target => target.classList.add('animate-in'));
    }

    // Initialize
    preloadImages();
});
