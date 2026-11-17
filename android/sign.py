"""
Firma un APK con el esquema v2 de Android (APK Signature Scheme v2, RSA 2048 + SHA-256).
Uso: python3 sign.py entrada.apk salida.apk carpeta_firma
- Si carpeta_firma no tiene clave, crea una (clave.pem y certificado.der) y la reutiliza en las siguientes compilaciones.
- La misma clave es necesaria para instalar una versión nueva encima de la anterior: guárdala.
- El APK de entrada ya debe estar alineado (zipalign).
Requiere: pip install cryptography
"""
import sys, os, struct, hashlib, datetime
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding

RSA_PKCS1_SHA256 = 0x0103
V2_ID = 0x7109871A
MAGIC = b"APK Sig Block 42"

def lp(b):  # bytes con prefijo de longitud (uint32 little endian)
    return struct.pack("<I", len(b)) + b

def key_and_cert(folder):
    os.makedirs(folder, exist_ok=True)
    kp, cp = os.path.join(folder, "clave.pem"), os.path.join(folder, "certificado.der")
    if os.path.exists(kp) and os.path.exists(cp):
        key = serialization.load_pem_private_key(open(kp, "rb").read(), None)
        return key, open(cp, "rb").read()
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Armario"),
                      x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Armario Urbano"),
                      x509.NameAttribute(NameOID.COUNTRY_NAME, "CO")])
    now = datetime.datetime(2026, 1, 1, tzinfo=datetime.timezone.utc)
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(x509.random_serial_number()).not_valid_before(now)
            .not_valid_after(now + datetime.timedelta(days=365 * 30)).sign(key, hashes.SHA256()))
    open(kp, "wb").write(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    der = cert.public_bytes(serialization.Encoding.DER)
    open(cp, "wb").write(der)
    return key, der

def find_eocd(data):
    i = data.rfind(b"PK\x05\x06", max(0, len(data) - 65557))
    if i < 0: raise SystemExit("No es un ZIP válido")
    cd_size, cd_off = struct.unpack("<II", data[i + 12:i + 20])
    return i, cd_off, cd_size

def digest(sections):
    chunks = []
    for s in sections:
        for k in range(0, len(s), 1 << 20):
            c = s[k:k + (1 << 20)]
            chunks.append(hashlib.sha256(b"\xa5" + struct.pack("<I", len(c)) + c).digest())
    return hashlib.sha256(b"\x5a" + struct.pack("<I", len(chunks)) + b"".join(chunks)).digest()

def main(src, dst, folder):
    data = open(src, "rb").read()
    eocd, cd_off, cd_size = find_eocd(data)
    if data[cd_off - 16:cd_off] == MAGIC: raise SystemExit("El APK ya está firmado")
    contents, cd, end = data[:cd_off], data[cd_off:cd_off + cd_size], data[eocd:]
    key, cert = key_and_cert(folder)
    pub = key.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    dg = digest([contents, cd, end])
    signed = lp(lp(struct.pack("<I", RSA_PKCS1_SHA256) + lp(dg))) + lp(lp(cert)) + lp(b"")
    sig = key.sign(signed, padding.PKCS1v15(), hashes.SHA256())
    signer = lp(signed) + lp(lp(struct.pack("<I", RSA_PKCS1_SHA256) + lp(sig))) + lp(pub)
    value = lp(lp(signer))
    pair = struct.pack("<Q", 4 + len(value)) + struct.pack("<I", V2_ID) + value
    size = len(pair) + 8 + 16
    block = struct.pack("<Q", size) + pair + struct.pack("<Q", size) + MAGIC
    end = end[:16] + struct.pack("<I", cd_off + len(block)) + end[20:]
    open(dst, "wb").write(contents + block + cd + end)
    print("Firmado:", dst, "| SHA-256 del certificado:", hashlib.sha256(cert).hexdigest())

if __name__ == "__main__":
    if len(sys.argv) != 4: raise SystemExit(__doc__)
    main(*sys.argv[1:])
