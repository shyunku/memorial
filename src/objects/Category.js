import Mutatable from "./Mutatable";
import sha256 from "sha256";

class Category extends Mutatable {
  constructor(title, secret = false, default_ = false) {
    super({
      cid: "id",
      title: "title",
      secret: "secret",
      locked: "locked",
      color: "color",
    });

    this.id = null;
    this.title = title;
    this.secret = secret;
    this.locked = secret;
    this.color = null;
    this.default = default_;
  }
}

export default Category;
