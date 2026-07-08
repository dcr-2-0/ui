import type { ReactNode } from 'react';
import { useCurrentQuarter } from '../../contexts/QuarterContext';
import type { PlanStatus, CompletionStatus } from '../../data/types';
import './PlanStepper.css';

interface PlanStepperProps {
  planStatus?: PlanStatus;
  completionStatus?: CompletionStatus;
  /** Tighter paddings + only the current step's label (for modals/panels) */
  compact?: boolean;
}

/**
 * Quarter lifecycle stepper — shows where a plan stands in the full journey:
 * Qx started → Build draft → TL approval → Plan approved → Work on plan →
 * Level-up review → Admin approval → Level up.
 *
 * Used on the Plan page (full size) and in the member details modal (compact),
 * so employees, TLs and admins all read plan state in the same language.
 */
export default function PlanStepper({ planStatus, completionStatus, compact = false }: PlanStepperProps) {
  const currentQuarter = useCurrentQuarter(); // e.g. "Q3-2026"

  const STEPS: { label: string; tip: ReactNode }[] = [
    {
      label: `${currentQuarter.split('-')[0]} started`,
      tip: 'A new quarter began — time to plan what you want to achieve in it.',
    },
    {
      label: 'Build draft',
      tip: (
        <>
          <span className="plan-step-tooltip-action">Add items</span> from the
          catalog until the plan meets all requirements for the next level.
          When it looks good,{' '}
          <span className="plan-step-tooltip-action">submit</span> it for the
          team leader to approve.
        </>
      ),
    },
    {
      label: 'TL approval',
      tip: 'The submitted plan waits for the team leader to review and approve it.',
    },
    {
      label: 'Plan approved',
      tip: 'The team leader approved the plan — it is locked in for the quarter.',
    },
    {
      label: 'Work on plan',
      tip: (
        <>
          <span className="plan-step-tooltip-action">
            Complete the items, attach proofs, and mark them as done.
          </span>{' '}
          Once all requirements are met,{' '}
          <span className="plan-step-tooltip-action">submit</span> the
          completed plan for level-up review.
        </>
      ),
    },
    {
      label: 'Level-up review',
      tip: 'The completed plan is reviewed by the team leader.',
    },
    {
      label: 'Admin approval',
      tip: 'An admin gives the final confirmation of the level-up.',
    },
    {
      label: 'Level up',
      tip: 'Congratulations — the new level is official!',
    },
  ];

  let current = 1; // Build draft
  let errorAt = -1;
  let hint = '';
  if (planStatus === 'pending') {
    current = 2;
  } else if (planStatus === 'rejected') {
    current = 2;
    errorAt = 2;
    hint = 'Rejected — edit & resubmit';
  } else if (planStatus === 'approved') {
    if (completionStatus === 'pending_review') current = 5;
    else if (completionStatus === 'admin_pending') current = 6;
    else if (completionStatus === 'level_up_rejected') {
      current = 5;
      errorAt = 5;
      hint = 'Revision needed — resubmit';
    } else if (completionStatus === 'level_up_approved') current = 8;
    else current = 4; // work on plan
  }

  return (
    <div className={`plan-stepper${compact ? ' plan-stepper-compact' : ''}`}>
      {STEPS.map(({ label, tip }, i) => {
        const state =
          i === errorAt
            ? 'error'
            : i < current
            ? 'done'
            : i === current
            ? 'current'
            : 'todo';
        return (
          <div key={label} className={`plan-step ${state}`}>
            <div className="plan-step-track">
              <div className={`plan-step-line${i === 0 ? ' invisible' : ''}${i <= current ? ' filled' : ''}`} />
              <div className="plan-step-dot">
                {state === 'done' ? (
                  <i className="ri-check-line"></i>
                ) : state === 'error' ? (
                  <i className="ri-close-line"></i>
                ) : i === STEPS.length - 1 ? (
                  <i className="ri-medal-line"></i>
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <div className={`plan-step-line${i === STEPS.length - 1 ? ' invisible' : ''}${i < current ? ' filled' : ''}`} />
            </div>
            <span className="plan-step-label">{label}</span>
            {(state === 'error' || state === 'current') && hint && i === (errorAt !== -1 ? errorAt : current) && errorAt !== -1 && (
              <span className="plan-step-hint">{hint}</span>
            )}
            <span className="plan-step-tooltip" role="tooltip">
              {tip}
            </span>
          </div>
        );
      })}
    </div>
  );
}
