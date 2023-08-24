import { Modaler } from "../molecules/Modal";
import TestModal from "../modals/Test.modal";
import SettingsModal from "../modals/Settings.modal";

export const MODAL_TYPES = {
  TEST: "TEST",
  SETTINGS: "SETTINGS",
};

const ModalRouter = () => {
  return (
    <Modaler>
      <TestModal id={MODAL_TYPES.TEST} />
      <SettingsModal id={MODAL_TYPES.SETTINGS} />
    </Modaler>
  );
};

export default ModalRouter;
