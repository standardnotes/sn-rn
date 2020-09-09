/* eslint-disable no-bitwise */
import Aes from 'react-native-aes-crypto';
import Sodium from 'react-native-sodium';
import { SNPureCrypto } from 'sncrypto/lib/common/pure_crypto';

export class SNReactNativeCrypto implements SNPureCrypto {
  deinit(): void {}
  public timingSafeEqual(a: string, b: string) {
    const strA = String(a);
    let strB = String(b);
    const lenA = strA.length;
    let result = 0;

    if (lenA !== strB.length) {
      strB = strA;
      result = 1;
    }

    for (let i = 0; i < lenA; i++) {
      result |= strA.charCodeAt(i) ^ strB.charCodeAt(i);
    }

    return result === 0;
  }
  public async pbkdf2(
    password: string,
    salt: string,
    iterations: number,
    length: number
  ): Promise<string | null> {
    return Aes.pbkdf2(password, salt, iterations, length);
  }

  public async generateRandomKey(bits: number): Promise<string> {
    const bytes = bits / 8;
    const result = await Sodium.randombytes_buf(bytes);
    return result;
  }

  public async aes256CbcEncrypt(
    plaintext: string,
    iv: string,
    key: string
  ): Promise<string | null> {
    try {
      return Aes.encrypt(plaintext, key, iv);
    } catch (e) {
      return null;
    }
  }

  public async aes256CbcDecrypt(
    ciphertext: string,
    iv: string,
    key: string
  ): Promise<string | null> {
    try {
      return Aes.decrypt(ciphertext, key, iv);
    } catch (e) {
      return null;
    }
  }

  public async hmac256(message: string, key: string): Promise<string | null> {
    try {
      return Aes.hmac256(message, key);
    } catch (e) {
      return null;
    }
  }

  public async sha256(text: string): Promise<string> {
    return Aes.sha256(text);
  }

  public unsafeSha1(text: string): Promise<string> {
    return Aes.sha1(text);
  }

  public async argon2(
    password: string,
    salt: string,
    iterations: number,
    bytes: number,
    length: number
  ): Promise<string> {
    const result = await Sodium.crypto_pwhash(
      length,
      password,
      salt,
      iterations,
      bytes,
      Sodium.crypto_pwhash_ALG_DEFAULT
    );
    return result;
  }

  public async xchacha20Encrypt(
    plaintext: string,
    nonce: string,
    key: string,
    assocData: string
  ): Promise<string> {
    return Sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      plaintext,
      nonce,
      key,
      assocData
    );
  }

  public async xchacha20Decrypt(
    ciphertext: string,
    nonce: string,
    key: string,
    assocData: string
  ): Promise<string | null> {
    try {
      const result = await Sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        ciphertext,
        nonce,
        key,
        assocData
      );
      return result;
    } catch (e) {
      return null;
    }
  }

  /**
   * Not implemented in SNReactNativeCrypto
   */
  public generateUUIDSync() {
    return '';
  }

  public async generateUUID() {
    const randomBuf = await Sodium.randombytes_buf(16);
    const tempBuf = new Uint8Array(randomBuf.length / 2);

    for (let i = 0; i < randomBuf.length; i += 2) {
      tempBuf[i / 2] = parseInt(randomBuf.substring(i, i + 2), 16);
    }

    const buf = new Uint32Array(tempBuf.buffer);
    let idx = -1;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (
      c
    ) {
      idx++;
      const r = (buf[idx >> 3] >> ((idx % 8) * 4)) & 15;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  public async base64Encode(text: string) {
    return Sodium.to_base64(
      text,
      Sodium.base64_variant_VARIANT_ORIGINAL_NO_PADDING
    );
  }

  public async base64Decode(base64String: string) {
    return Sodium.from_base64(
      base64String,
      Sodium.base64_variant_VARIANT_ORIGINAL_NO_PADDING
    );
  }
}
