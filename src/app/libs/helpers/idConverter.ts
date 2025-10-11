import Hashids from "hashids";
const SECRET_SALT = process.env["SECRET_SALT"] || "SECRET SALT";
const hashids = new Hashids(SECRET_SALT, 11);
class IdConverter {
  public static encode(id: bigint): string {
    return hashids.encodeHex(id.toString(16));
  }

  public static decode(public_id: string): bigint {
    try {
      const hex = hashids.decodeHex(public_id);
      if (!hex) return BigInt(-1);
      return BigInt("0x" + hex);
    } catch (error) {
      void error;
      return BigInt(-1);
    }
    
  }
}
export default IdConverter;
