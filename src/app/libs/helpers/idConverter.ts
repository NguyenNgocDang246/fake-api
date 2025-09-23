import Hashids from "hashids";
const SECRET_SALT = process.env.SECRET_SALT || "SECRET SALT";
const hashids = new Hashids(SECRET_SALT, 10);
class IdConverter {
  public static encode(id: number): string {
    return hashids.encode(id);
  }

  public static decode(public_id: string): number {
    const decode = hashids.decode(public_id)[0];
    return decode as number;
  }
}
export default IdConverter;
