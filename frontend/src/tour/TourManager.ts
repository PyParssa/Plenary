import { driver, DriveStep, Config } from 'driver.js';
import './tour.css';

export const TOUR_STORAGE_KEY = 'plenary_tour_completed';

export function isTourCompleted(): boolean {
  return localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
}

export function setTourCompleted(completed = true): void {
  if (completed) {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  } else {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  }
}

/**
 * Returns the best visible selector between desktop and mobile targets
 */
function getTargetSelector(desktopSel: string, mobileSel?: string): string {
  if (mobileSel && window.innerWidth < 768) {
    const mobileEl = document.querySelector(mobileSel);
    if (mobileEl) return mobileSel;
  }
  return desktopSel;
}

export const TOUR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="tour-first-card"]',
    popover: {
      title: 'The Inquiry Deck',
      description:
        'Welcome to Plenary. Each card holds a question from a great thinker. Swipe through the deck to explore.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="tour-vouch-btn"]',
    popover: {
      title: '3-Second Vouch',
      description:
        'Found a question that resonates? Hold for 3 seconds to vouch. It saves the card to your personal Vault.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: () => getTargetSelector('[data-tour="tour-nav-vault"]', '[data-tour="tour-nav-vault-mobile"]'),
    popover: {
      title: 'Your Personal Vault',
      description:
        "Your Vault holds every question you've vouched for. Return here to reflect on them.",
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="tour-reflect-btn"]',
    popover: {
      title: 'Socratic AI Reflection',
      description:
        'Tap here to open a Socratic AI conversation. It will challenge your thinking through the lens of this card.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: () => getTargetSelector('[data-tour="tour-nav-discovery"]', '[data-tour="tour-nav-discovery-mobile"]'),
    popover: {
      title: 'Discovery & Authors',
      description:
        'Discover authors and categories. Creators can contribute new inquiry cards here.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="tour-nav-account"]',
    popover: {
      title: 'Personal Account',
      description:
        'Set up your account to sync your vouches across devices and unlock AI reflections.',
      side: 'bottom',
      align: 'end',
    },
  },
];

export interface TourCallbacks {
  onComplete?: () => void;
  onExit?: () => void;
}

export function startTour(callbacks?: TourCallbacks) {
  // Ensure the tour starts on the deck where card elements exist
  const driverObj = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    popoverClass: 'plenary-tour-popover',
    nextBtnText: 'Next →',
    prevBtnText: '← Back',
    doneBtnText: 'Finish',
    onDestroyStarted: () => {
      setTourCompleted(true);
      driverObj.destroy();
      callbacks?.onComplete?.();
    },
    steps: TOUR_STEPS,
  } as Config);

  // Small delay to ensure DOM render settled
  setTimeout(() => {
    driverObj.drive();
  }, 200);

  return driverObj;
}

export function replayTour(callbacks?: TourCallbacks) {
  setTourCompleted(false);
  return startTour(callbacks);
}

