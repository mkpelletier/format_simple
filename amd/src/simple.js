// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * JavaScript module for the Simple course format.
 *
 * Handles section navigation, outcomes popout, top nav hover reveal,
 * smooth transitions, and keyboard navigation.
 *
 * @module     format_simple/simple
 * @copyright  2025 South African Theological Seminary <ict@sats.ac.za>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define(['core/ajax'], function(Ajax) {
    'use strict';

    /** @type {HTMLElement} Root element. */
    let root = null;

    /** @type {number} Currently active section number. */
    let activeSection = 0;

    /** @type {boolean} Whether the nav is open on mobile. */
    let navOpen = false;

    /** @type {number|null} Timer ID for nav auto-collapse. */
    let collapseTimer = null;

    /** @type {number} Delay in ms before nav collapses. */
    const COLLAPSE_DELAY = 3000;

    /** @type {number|null} Timer ID for drawer auto-hide. */
    let drawerHideTimer = null;

    /** @type {number} Delay in ms before drawer auto-hides. */
    const DRAWER_HIDE_DELAY = 3000;

    /**
     * Initialise the Simple format interactions.
     *
     * @param {string} rootId The ID of the root element.
     */
    const init = function(rootId) {
        root = document.getElementById(rootId);
        if (!root) {
            return;
        }

        activeSection = parseInt(root.dataset.activesection, 10) || 0;

        setupNavigation();
        setupNavCollapse();
        setupOutcomesPopovers();
        setupTopNavHover();
        setupKeyboardNav();
        setupMobileNav();
        setupDrawerAutoHide();
        setupZoneGrouping();
        setupManualCompletion();
        restoreFromHash();
    };

    /**
     * Set up section navigation click handlers.
     */
    const setupNavigation = function() {
        const navItems = root.querySelectorAll('.simple-nav-item');

        navItems.forEach(function(item) {
            item.addEventListener('click', function(e) {
                e.preventDefault();

                // Don't navigate to restricted sections (unless editing).
                if (item.classList.contains('is-restricted') && item.getAttribute('aria-disabled') === 'true') {
                    return;
                }

                const sectionNum = parseInt(item.dataset.section, 10);
                if (sectionNum === activeSection) {
                    return;
                }

                switchSection(sectionNum);
            });
        });
    };

    /**
     * Switch to a different section with a smooth transition.
     *
     * @param {number} sectionNum The section number to switch to.
     */
    const switchSection = function(sectionNum) {
        const currentSection = root.querySelector('.simple-section.is-active');
        const targetSection = root.querySelector('#simple-section-' + sectionNum);

        if (!targetSection) {
            return;
        }

        // Update navigation state.
        const navItems = root.querySelectorAll('.simple-nav-item');
        navItems.forEach(function(item) {
            const num = parseInt(item.dataset.section, 10);
            item.classList.toggle('is-active', num === sectionNum);
            item.setAttribute('aria-current', num === sectionNum ? 'true' : 'false');
        });

        // Transition: fade out current, fade in target.
        if (currentSection && currentSection !== targetSection) {
            currentSection.style.opacity = '0';
            currentSection.style.transform = 'translateX(-8px)';

            setTimeout(function() {
                currentSection.classList.remove('is-active');
                currentSection.hidden = true;
                currentSection.style.opacity = '';
                currentSection.style.transform = '';

                targetSection.hidden = false;
                targetSection.classList.add('is-active');
                targetSection.style.opacity = '0';
                targetSection.style.transform = 'translateX(8px)';

                // Force reflow before animating in.
                void targetSection.offsetHeight;

                targetSection.style.transition = 'opacity 500ms cubic-bezier(0.4, 0, 0.2, 1), '
                    + 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)';
                targetSection.style.opacity = '1';
                targetSection.style.transform = 'translateX(0)';

                setTimeout(function() {
                    targetSection.style.transition = '';
                    targetSection.style.opacity = '';
                    targetSection.style.transform = '';
                }, 510);
            }, 400);
        } else if (!currentSection) {
            targetSection.hidden = false;
            targetSection.classList.add('is-active');
        }

        activeSection = sectionNum;

        // Update URL hash.
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', '#section-' + sectionNum);
        }

        // Close mobile nav after selection.
        if (navOpen) {
            toggleMobileNav();
        }

        // Restart collapse timer after interaction.
        var nav = root.querySelector('.simple-nav');
        if (nav) {
            startCollapseTimer(nav);
        }

        // Scroll content to top.
        const content = root.querySelector('.simple-content');
        if (content) {
            content.scrollTop = 0;
        }
    };

    /**
     * Set up auto-collapse of the navigation panel.
     *
     * After 5 seconds of inactivity the nav slides down to show only
     * progress indicators. Hovering expands it again.
     */
    const setupNavCollapse = function() {
        const nav = root.querySelector('.simple-nav');
        if (!nav) {
            return;
        }

        // Start the initial collapse timer.
        startCollapseTimer(nav);

        // Expand on mouse enter.
        nav.addEventListener('mouseenter', function() {
            clearTimeout(collapseTimer);
            nav.classList.remove('is-collapsed');
        });

        // Re-start collapse timer on mouse leave.
        nav.addEventListener('mouseleave', function() {
            startCollapseTimer(nav);
        });
    };

    /**
     * Start (or restart) the nav collapse timer.
     *
     * @param {HTMLElement} nav The navigation element.
     */
    const startCollapseTimer = function(nav) {
        clearTimeout(collapseTimer);
        collapseTimer = setTimeout(function() {
            nav.classList.add('is-collapsed');
        }, COLLAPSE_DELAY);
    };

    /**
     * Set up outcomes popout toggle buttons.
     */
    const setupOutcomesPopovers = function() {
        const buttons = root.querySelectorAll('[data-action="toggle-outcomes"]');

        buttons.forEach(function(btn) {
            btn.addEventListener('click', function() {
                const sectionNum = btn.dataset.section;
                const panel = root.querySelector('#simple-outcomes-panel-' + sectionNum);

                if (!panel) {
                    return;
                }

                const isExpanded = btn.getAttribute('aria-expanded') === 'true';
                btn.setAttribute('aria-expanded', !isExpanded);

                if (isExpanded) {
                    panel.hidden = true;
                } else {
                    panel.hidden = false;
                }
            });
        });

        // Close outcomes panel when clicking outside.
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.simple-outcomes-btn') && !e.target.closest('.simple-outcomes-panel')) {
                const openButtons = root.querySelectorAll('[data-action="toggle-outcomes"][aria-expanded="true"]');
                openButtons.forEach(function(btn) {
                    btn.setAttribute('aria-expanded', 'false');
                    const sectionNum = btn.dataset.section;
                    const panel = root.querySelector('#simple-outcomes-panel-' + sectionNum);
                    if (panel) {
                        panel.hidden = true;
                    }
                });
            }
        });
    };

    /**
     * Set up the top navigation hover reveal zone for the breadcrumb.
     * Hovering the top edge or the navbar reveals the breadcrumb;
     * leaving hides it after a 3-second delay.
     */
    const setupTopNavHover = function() {
        // Create a hover trigger zone at the very top of the page.
        const triggerZone = document.createElement('div');
        triggerZone.className = 'simple-topnav-trigger';
        triggerZone.style.cssText = 'position:fixed;top:0;left:0;right:0;height:8px;z-index:9999;';

        var hideTimer = null;

        var showNav = function() {
            if (hideTimer) {
                clearTimeout(hideTimer);
                hideTimer = null;
            }
            document.body.classList.add('simple-topnav-visible');
        };

        var hideNav = function(e) {
            var related = e.relatedTarget;
            if (related && (
                triggerZone.contains(related) ||
                (navbar && navbar.contains(related))
            )) {
                return;
            }
            if (hideTimer) {
                clearTimeout(hideTimer);
            }
            hideTimer = setTimeout(function() {
                document.body.classList.remove('simple-topnav-visible');
                hideTimer = null;
            }, 3000);
        };

        triggerZone.addEventListener('mouseenter', showNav);
        triggerZone.addEventListener('mouseleave', hideNav);

        var navbar = document.getElementById('page-navbar');
        if (navbar) {
            navbar.addEventListener('mouseenter', showNav);
            navbar.addEventListener('mouseleave', hideNav);
        }

        document.body.appendChild(triggerZone);
    };

    /**
     * Set up keyboard navigation between units.
     */
    const setupKeyboardNav = function() {
        root.addEventListener('keydown', function(e) {
            // Only respond when focus is in the nav panel.
            if (!e.target.closest('.simple-nav')) {
                return;
            }

            const navItems = Array.from(root.querySelectorAll('.simple-nav-item:not(.is-restricted)'));
            const currentIndex = navItems.indexOf(e.target);

            if (currentIndex === -1) {
                return;
            }

            let targetIndex = -1;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    targetIndex = Math.min(currentIndex + 1, navItems.length - 1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    targetIndex = Math.max(currentIndex - 1, 0);
                    break;
                case 'Home':
                    e.preventDefault();
                    targetIndex = 0;
                    break;
                case 'End':
                    e.preventDefault();
                    targetIndex = navItems.length - 1;
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    e.target.click();
                    return;
            }

            if (targetIndex >= 0 && targetIndex !== currentIndex) {
                navItems[targetIndex].focus();
            }
        });
    };

    /** @type {number} Breakpoint width at which mobile header appears. */
    const MOBILE_BREAKPOINT = 1024;

    /**
     * Set up mobile navigation toggle.
     *
     * Only creates the mobile header bar when the viewport is at or below the
     * tablet breakpoint. Listens for resize events to add/remove it dynamically.
     */
    const setupMobileNav = function() {
        var mobileHeader = null;

        var createMobileHeader = function() {
            if (mobileHeader) {
                return;
            }
            mobileHeader = document.createElement('div');
            mobileHeader.className = 'simple-mobile-header';

            var toggleBtn = document.createElement('button');
            toggleBtn.className = 'simple-mobile-nav-toggle';
            toggleBtn.type = 'button';
            toggleBtn.innerHTML = '<i class="fa fa-bars" aria-hidden="true"></i>'
                + '<span class="sr-only">Toggle navigation</span>';
            toggleBtn.addEventListener('click', toggleMobileNav);

            var courseTitle = document.createElement('span');
            courseTitle.className = 'simple-mobile-course-title';
            var pageHeading = document.querySelector('#page-header h1, #page-header .h2');
            if (pageHeading) {
                courseTitle.textContent = pageHeading.textContent.trim();
            }

            mobileHeader.appendChild(toggleBtn);
            mobileHeader.appendChild(courseTitle);

            var nav = root.querySelector('.simple-nav');
            if (nav) {
                root.insertBefore(mobileHeader, nav);
            }
        };

        var removeMobileHeader = function() {
            if (!mobileHeader) {
                return;
            }
            mobileHeader.remove();
            mobileHeader = null;

            // Ensure nav is visible when switching back to desktop.
            var nav = root.querySelector('.simple-nav');
            if (nav) {
                nav.classList.remove('is-open');
                navOpen = false;
            }
        };

        var handleResize = function() {
            if (window.innerWidth <= MOBILE_BREAKPOINT) {
                createMobileHeader();
            } else {
                removeMobileHeader();
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
    };

    /**
     * Toggle mobile navigation visibility.
     */
    const toggleMobileNav = function() {
        const nav = root.querySelector('.simple-nav');
        if (!nav) {
            return;
        }

        navOpen = !navOpen;
        nav.classList.toggle('is-open', navOpen);

        const toggleBtn = root.querySelector('.simple-mobile-nav-toggle');
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', navOpen);
        }
    };

    /**
     * Set up auto-hide for the right blocks drawer.
     *
     * When the drawer is opened, it will close itself after DRAWER_HIDE_DELAY ms
     * of no mouse activity. Uses Boost's own close mechanism to avoid state conflicts.
     */
    const setupDrawerAutoHide = function() {
        var drawer = document.querySelector('.drawer.drawer-right');
        if (!drawer) {
            return;
        }

        // Observe class changes to detect when Boost opens/closes the drawer.
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    if (drawer.classList.contains('show')) {
                        startDrawerHideTimer(drawer);
                    } else {
                        clearTimeout(drawerHideTimer);
                    }
                }
            });
        });

        observer.observe(drawer, {attributes: true, attributeFilter: ['class']});

        // Cancel auto-hide while the user is interacting with the drawer.
        drawer.addEventListener('mouseenter', function() {
            clearTimeout(drawerHideTimer);
        });

        // Restart timer when the mouse leaves the drawer.
        drawer.addEventListener('mouseleave', function() {
            if (drawer.classList.contains('show')) {
                startDrawerHideTimer(drawer);
            }
        });
    };

    /**
     * Start the drawer auto-hide timer.
     *
     * Closes the drawer through Boost's own close button to keep state in sync.
     *
     * @param {HTMLElement} drawer The drawer element.
     */
    const startDrawerHideTimer = function(drawer) {
        clearTimeout(drawerHideTimer);
        drawerHideTimer = setTimeout(function() {
            var closeBtn = drawer.querySelector('[data-action="closedrawer"]');
            if (closeBtn) {
                closeBtn.click();
            }
        }, DRAWER_HIDE_DELAY);
    };

    /**
     * Set up zone grouping for DnD compatibility.
     *
     * Moodle's reactive editor _fixOrder() pulls all [data-for="cmitem"] elements
     * out of any nested containers and appends them flat to the cmlist. This
     * destroys our zone structure. We use a MutationObserver to detect when
     * this happens and re-group items back behind their zone headers based
     * on each item's data-zone attribute.
     */
    const setupZoneGrouping = function() {
        var cmlists = root.querySelectorAll('.simple-cmlist[data-for="cmlist"]');
        cmlists.forEach(function(cmlist) {
            var observer = new MutationObserver(function() {
                // Disconnect before making DOM changes to prevent infinite loop.
                observer.disconnect();
                // Delay slightly to let all core reactive updates finish.
                setTimeout(function() {
                    regroupZones(cmlist);
                    // Reconnect after our DOM changes are complete.
                    observer.observe(cmlist, {childList: true});
                }, 50);
            });

            observer.observe(cmlist, {childList: true});
        });
    };

    /** @type {string[]} Zone order for regrouping. */
    var ZONE_ORDER = ['learning', 'resources', 'activities'];

    /**
     * Re-group cmitems behind their zone headers.
     *
     * Collects all [data-for="cmitem"] elements, groups them by data-zone,
     * and inserts them after the corresponding [data-zone-header] element.
     * Zone headers with no children are hidden. Skips DOM work if items
     * are already in the correct order.
     *
     * @param {HTMLElement} cmlist The cmlist container.
     */
    const regroupZones = function(cmlist) {
        var headers = {};
        var items = {};

        // Collect zone headers.
        ZONE_ORDER.forEach(function(zone) {
            headers[zone] = cmlist.querySelector('[data-zone-header="' + zone + '"]');
            items[zone] = [];
        });

        // Collect all cmitems and group by zone.
        var allItems = cmlist.querySelectorAll('[data-for="cmitem"]');
        allItems.forEach(function(item) {
            var zone = item.getAttribute('data-zone');
            if (zone && items[zone]) {
                items[zone].push(item);
            } else {
                // Items without a zone go to activities by default.
                items.activities.push(item);
            }
        });

        // Build desired order of children.
        var desiredOrder = [];
        ZONE_ORDER.forEach(function(zone) {
            if (headers[zone]) {
                desiredOrder.push(headers[zone]);
            }
            items[zone].forEach(function(item) {
                desiredOrder.push(item);
            });
        });

        // Collect remaining non-cmitem, non-header children (e.g. sectioninfo).
        var remaining = Array.from(cmlist.children).filter(function(child) {
            return !child.hasAttribute('data-zone-header') && child.getAttribute('data-for') !== 'cmitem';
        });
        remaining.forEach(function(child) {
            desiredOrder.push(child);
        });

        // Check if already in correct order — skip DOM work if so.
        var currentChildren = Array.from(cmlist.children);
        if (currentChildren.length === desiredOrder.length) {
            var inOrder = true;
            for (var i = 0; i < currentChildren.length; i++) {
                if (currentChildren[i] !== desiredOrder[i]) {
                    inOrder = false;
                    break;
                }
            }
            if (inOrder) {
                // Just update header visibility and return.
                ZONE_ORDER.forEach(function(zone) {
                    if (headers[zone]) {
                        headers[zone].hidden = (items[zone].length === 0);
                    }
                });
                return;
            }
        }

        // Rebuild the cmlist in zone order.
        var fragment = document.createDocumentFragment();
        desiredOrder.forEach(function(child) {
            fragment.appendChild(child);
        });
        cmlist.appendChild(fragment);

        // Update header visibility.
        ZONE_ORDER.forEach(function(zone) {
            if (headers[zone]) {
                headers[zone].hidden = (items[zone].length === 0);
            }
        });
    };

    /**
     * Set up manual completion toggle buttons.
     *
     * Listens for clicks on [data-action="toggle-completion"] buttons
     * and calls the Moodle web service to toggle the completion state.
     */
    const setupManualCompletion = function() {
        root.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-action="toggle-completion"]');
            if (!btn) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();

            var cmid = parseInt(btn.dataset.cmid, 10);
            var isComplete = btn.classList.contains('is-complete');
            var newState = isComplete ? 0 : 1;

            // Optimistic UI update.
            btn.classList.toggle('is-complete');
            var icon = btn.querySelector('i');
            if (icon) {
                if (newState) {
                    icon.className = 'fa fa-check-square';
                    btn.title = 'Mark as not complete';
                } else {
                    icon.className = 'fa fa-square-o';
                    btn.title = 'Mark as complete';
                }
            }

            // Call Moodle web service.
            Ajax.call([{
                methodname: 'core_completion_update_activity_completion_status_manually',
                args: {cmid: cmid, completed: newState},
                fail: function() {
                    // Revert on failure.
                    btn.classList.toggle('is-complete');
                    if (icon) {
                        if (newState) {
                            icon.className = 'fa fa-square-o';
                            btn.title = 'Mark as complete';
                        } else {
                            icon.className = 'fa fa-check-square';
                            btn.title = 'Mark as not complete';
                        }
                    }
                }
            }]);
        });
    };

    /**
     * Restore active section from URL hash.
     */
    const restoreFromHash = function() {
        const hash = window.location.hash;
        if (!hash) {
            return;
        }

        const match = hash.match(/^#section-(\d+)$/);
        if (match) {
            const sectionNum = parseInt(match[1], 10);
            if (sectionNum !== activeSection) {
                switchSection(sectionNum);
            }
        }
    };

    return {
        init: init
    };
});
