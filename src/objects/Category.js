import Mutatable from "./Mutatable";
import sha256 from "sha256";

class Category extends Mutatable {
  constructor(title, secret = false, default_ = false) {
    super({
      cid: "id",
      title: "title",
      secret: "secret",
      encrypted_pw: "encryptedPw",
      color: "color",
    });

    this.id = null;
    this.title = title;
    this.secret = secret;
    this.encryptedPw = null;
    this.color = null;
    this.default = default_;
  }

  setPassword(password) {
    this.encryptedPw = sha256(password);
  }
}

export default Category;
