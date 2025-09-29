import Hashids from "hashids";
const SECRET_SALT = process.env.SECRET_SALT || "SECRET SALT";
const hashids = new Hashids(SECRET_SALT, 11);
class IdConverter {
  public static encode(id: bigint): string {
    return hashids.encodeHex(id.toString());
  }

  public static decode(public_id: string): bigint {
    const hex = hashids.decodeHex(public_id);
    if (!hex) {
      throw new Error("Invalid id");
    }
    return BigInt("0x" + hex);
  }
}
export default IdConverter;
