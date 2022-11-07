import { NowRequest, NowResponse } from '@vercel/node'

export default async function (req: NowRequest, res: NowResponse) {
  res.status(200).json({alive: true})
}