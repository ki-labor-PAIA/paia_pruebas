import SpotlightTour from '@/components/tutorial/SpotlightTour';
import tutorialSteps from '@/components/tutorial/steps';

export default function SimulatePage(props) {
  // tu componente actual...
  return (
    <>
      {/* tu UI */}
      <SpotlightTour steps={tutorialSteps} />
    </>
  );
}
