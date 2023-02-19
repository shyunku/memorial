import "./ProfileImage.scss";
import { IoPerson } from "react-icons/io5";

const ProfileImage = ({ src, size = 32 }) => {
  return (
    <div className="profile-img" style={{ width: size, height: size, minWidth: size }}>
      {src ? <img src={src} /> : <IoPerson />}
    </div>
  );
};

export default ProfileImage;
