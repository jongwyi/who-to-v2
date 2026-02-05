import { t } from './i18n.js';

const TUTORIAL_STEPS = {
    instructor: [
        { titleKey: 'tutorialInstructorStep1', instructionKey: 'tutorialInstructorStep1Desc', image: 'assets/tutorial/instructor-side/step1.png' },
        { titleKey: 'tutorialInstructorStep2', instructionKey: 'tutorialInstructorStep2Desc', image: 'assets/tutorial/instructor-side/step2.png' },
        { titleKey: 'tutorialInstructorStep3', instructionKey: 'tutorialInstructorStep3Desc', image: 'assets/tutorial/instructor-side/step3.png' },
        { titleKey: 'tutorialInstructorStep4', instructionKey: 'tutorialInstructorStep4Desc', image: 'assets/tutorial/instructor-side/step4.png' }
    ],
    participant: [
        { titleKey: 'tutorialParticipantStep1', instructionKey: 'tutorialParticipantStep1Desc', image: 'assets/tutorial/participant-side/step1.png' },
        { titleKey: 'tutorialParticipantStep2', instructionKey: 'tutorialParticipantStep2Desc', image: 'assets/tutorial/participant-side/step2.png' },
        { titleKey: 'tutorialParticipantStep3', instructionKey: 'tutorialParticipantStep3Desc', image: 'assets/tutorial/participant-side/step3.png' },
        { titleKey: 'tutorialParticipantStep4', instructionKey: 'tutorialParticipantStep4Desc', image: 'assets/tutorial/participant-side/step4.png' }
    ]
};

let currentRole = null;
let currentStep = 0;
const totalSteps = 4;

function showRoleModal() {
    const modal = document.getElementById('tutorial-role-modal');
    if (modal) {
        modal.classList.add('tutorial-overlay-visible');
        modal.setAttribute('aria-hidden', 'false');
    }
}

function hideRoleModal() {
    const modal = document.getElementById('tutorial-role-modal');
    if (modal) {
        modal.classList.remove('tutorial-overlay-visible');
        modal.setAttribute('aria-hidden', 'true');
    }
}

function showStepModal() {
    const modal = document.getElementById('tutorial-step-modal');
    if (modal) {
        modal.classList.add('tutorial-overlay-visible');
        modal.setAttribute('aria-hidden', 'false');
        renderStep();
    }
}

function hideStepModal() {
    const modal = document.getElementById('tutorial-step-modal');
    if (modal) {
        modal.classList.remove('tutorial-overlay-visible');
        modal.setAttribute('aria-hidden', 'true');
    }
}

function renderStep() {
    if (!currentRole || !TUTORIAL_STEPS[currentRole]) return;
    const steps = TUTORIAL_STEPS[currentRole];
    const step = steps[currentStep];
    if (!step) return;

    const titleEl = document.getElementById('tutorial-step-title');
    const imageEl = document.getElementById('tutorial-step-image');
    const instructionEl = document.getElementById('tutorial-step-instruction');
    const counterEl = document.getElementById('tutorial-step-counter');
    const prevBtn = document.getElementById('tutorial-prev');
    const nextBtn = document.getElementById('tutorial-next');

    if (titleEl) titleEl.textContent = t(step.titleKey);
    if (imageEl) {
        imageEl.src = step.image;
        imageEl.alt = t(step.titleKey);
    }
    if (instructionEl) instructionEl.textContent = t(step.instructionKey);
    if (counterEl) counterEl.textContent = (t('stepCounter') || 'Step %1 / %2').replace('%1', currentStep + 1).replace('%2', totalSteps);

    document.querySelectorAll('.tutorial-progress-dot').forEach((dot, i) => {
        dot.classList.remove('active', 'completed');
        if (i === currentStep) dot.classList.add('active');
        if (i < currentStep) dot.classList.add('completed');
    });

    if (prevBtn) prevBtn.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
    if (nextBtn) nextBtn.textContent = currentStep === totalSteps - 1 ? t('done') : t('tutorialNext');
}

function startTutorial(role) {
    currentRole = role;
    currentStep = 0;
    hideRoleModal();
    showStepModal();
}

function nextStep() {
    if (currentStep < totalSteps - 1) {
        currentStep++;
        renderStep();
    } else {
        hideStepModal();
    }
}

function prevStep() {
    if (currentStep > 0) {
        currentStep--;
        renderStep();
    }
}

export function refreshIfVisible() {
    const stepModal = document.getElementById('tutorial-step-modal');
    if (stepModal && stepModal.classList.contains('tutorial-overlay-visible') && currentRole !== null) {
        renderStep();
    }
}

export function initTutorial() {
    const btnViewTutorial = document.getElementById('btn-view-tutorial');
    const roleModal = document.getElementById('tutorial-role-modal');
    const roleClose = document.getElementById('tutorial-role-close');
    const stepClose = document.getElementById('tutorial-step-close');
    const roleCards = document.querySelectorAll('.tutorial-role-card');
    const prevBtn = document.getElementById('tutorial-prev');
    const nextBtn = document.getElementById('tutorial-next');

    if (btnViewTutorial) {
        btnViewTutorial.addEventListener('click', (e) => {
            e.preventDefault();
            showRoleModal();
        });
    }

    if (roleClose) roleClose.addEventListener('click', hideRoleModal);
    if (stepClose) stepClose.addEventListener('click', hideStepModal);

    if (roleModal) {
        roleModal.addEventListener('click', (e) => {
            if (e.target === roleModal) hideRoleModal();
        });
    }

    const stepModal = document.getElementById('tutorial-step-modal');
    if (stepModal) {
        stepModal.addEventListener('click', (e) => {
            if (e.target === stepModal) hideStepModal();
        });
    }

    roleCards.forEach((card) => {
        card.addEventListener('click', () => {
            const role = card.getAttribute('data-role');
            if (role) startTutorial(role);
        });
    });

    if (prevBtn) prevBtn.addEventListener('click', prevStep);
    if (nextBtn) nextBtn.addEventListener('click', nextStep);
}
