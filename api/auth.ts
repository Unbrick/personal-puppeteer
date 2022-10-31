import { NowRequest, NowResponse } from '@vercel/node'

export const allowList: { [iat: string]: AllowListItem } = {
  dtinth: {
    publicKey: `-----BEGIN RSA PUBLIC KEY-----
MIIBigKCAYEA1+EelYd/Q9bvgidaMEP/CHIBGIDTdbMpM4OFD8ab/2gg5sRiW14t
H0UKhDn1KRcG+Gd2zuZUZ+4ghOtIHHXA7rG01fuQcqUudBIyQLZt/amhWThcPNtN
lRV5Xkc+tHHLFYbqYv+QVPmPg1GTq/Uj/rIdmSiv22uMUKQ+xuDQo02k0OwtGG5E
QIoipO/gcugEAUS76S4usBcz7wGrkmH+mneYCOGZZzhJVbxggVvNDmRj9aHKemWM
+BtoyN71xeq3sX+6bMFWZQgm2qAE5BebjWoFBgyNMS7J6x8Ad8I2TLUXPiQOCfDi
HGKRxsFBWb/14U4fkg78xfN2oS9l2R1WR8H08d6lo6Mul6xybQwZDkGIop8V0O4x
o7eL51kNuNAw/2eoYByOnAxgS7hhfddzn2bTsxWiWwgdvGvR9Ar3tshQjZ5vN+f5
IJnigKVopmlhb4Rn7erXt7UyDS4ZmsXV1NzauzPl3OfrIlgNeM8UMD0Qo6kYrVTD
ky6jTrhvpRnfAgMBAAE=
-----END RSA PUBLIC KEY-----`,
  },
}

type AllowListItem = {
  publicKey: string
}

export default async function (req: NowRequest, res: NowResponse) {
  res.json(allowList)
}
