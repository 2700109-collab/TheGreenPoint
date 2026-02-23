import { Composition } from "remotion";
import { NctsProposal } from "./NctsProposal";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="NctsProposal"
        component={NctsProposal}
        durationInFrames={3600}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
