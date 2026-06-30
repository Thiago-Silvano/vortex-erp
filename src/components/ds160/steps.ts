import { ComponentType } from 'react';
import { DS160StepProps, DS160_STEP_LABELS } from './types';
import DS160Step1 from './DS160Step1';
import DS160Step2 from './DS160Step2';
import DS160Step3 from './DS160Step3';
import DS160Step4 from './DS160Step4';
import DS160Step5 from './DS160Step5';
import DS160Step6 from './DS160Step6';
import DS160Step7 from './DS160Step7';
import DS160Step8 from './DS160Step8';
import DS160Step9 from './DS160Step9';
import DS160Step10 from './DS160Step10';
import DS160Step11 from './DS160Step11';
import DS160Step12 from './DS160Step12';
import DS160Step13 from './DS160Step13';
import DS160Step14 from './DS160Step14';
import DS160Step15 from './DS160Step15';

export const DS160_STEP_COMPONENTS: ComponentType<any>[] = [
  DS160Step1, DS160Step2, DS160Step3, DS160Step4, DS160Step5,
  DS160Step6, DS160Step7, DS160Step8, DS160Step9, DS160Step10,
  DS160Step11, DS160Step12, DS160Step13, DS160Step14, DS160Step15,
];

export const DS160_STEPS = DS160_STEP_LABELS.map((label, i) => ({
  num: i + 1,
  label,
  Component: DS160_STEP_COMPONENTS[i] as ComponentType<DS160StepProps & { onGoToStep?: (idx: number) => void }>,
}));

export const DS160_TOTAL_STEPS = DS160_STEP_COMPONENTS.length;
