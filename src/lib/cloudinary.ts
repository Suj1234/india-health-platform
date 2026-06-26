import { v2 as cloudinary } from 'cloudinary'
import { allowInsecureTlsIfEnabled } from './server-network'

allowInsecureTlsIfEnabled()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

const FOLDER = process.env.CLOUDINARY_FOLDER ?? 'india-health'

function isCloudinaryConfigured(): boolean {
  const key = process.env.CLOUDINARY_API_KEY ?? ''
  const secret = process.env.CLOUDINARY_API_SECRET ?? ''
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? ''
  return key.length > 0 && !key.includes('REPLACE') &&
         secret.length > 0 && !secret.includes('REPLACE') &&
         cloud.length > 0 && !cloud.includes('REPLACE')
}

function mockUploadResult(publicId: string, mimeType?: string): UploadResult {
  const format = mimeType === 'application/pdf' ? 'pdf' : 'jpg'
  return {
    public_id: publicId,
    secure_url: `https://mock-cloudinary.local/${publicId}.${format}`,
    bytes: 0,
    format,
  }
}

export interface UploadResult {
  public_id: string
  secure_url: string
  bytes: number
  format: string
}

export async function uploadDocument({
  fileBuffer,
  insurerSlug,
  applicationId,
  documentType,
  mimeType,
}: {
  fileBuffer: Buffer
  insurerSlug: string
  applicationId: string
  documentType: string
  mimeType: string
}): Promise<UploadResult> {
  const timestamp = Date.now()
  const folder = `${FOLDER}/${insurerSlug}/${applicationId}`
  const publicId = `${folder}/${documentType}_${timestamp}`

  if (!isCloudinaryConfigured()) {
    return mockUploadResult(publicId, mimeType)
  }

  const resourceType = mimeType === 'application/pdf' ? 'raw' : 'image'

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: resourceType,
        overwrite: false,
        tags: ['document', documentType, applicationId],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload failed'))
          return
        }
        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
          bytes: result.bytes,
          format: result.format,
        })
      }
    )
    stream.end(fileBuffer)
  })
}

export async function uploadPolicyPdf({
  pdfBuffer,
  insurerSlug,
  policyNumber,
}: {
  pdfBuffer: Buffer
  insurerSlug: string
  policyNumber: string
}): Promise<UploadResult> {
  const folder = `${FOLDER}/${insurerSlug}/policies`
  const publicId = `${folder}/${policyNumber}`

  if (!isCloudinaryConfigured()) {
    return mockUploadResult(publicId, 'application/pdf')
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: 'raw',
        overwrite: true,
        tags: ['policy', policyNumber],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload failed'))
          return
        }
        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
          bytes: result.bytes,
          format: result.format,
        })
      }
    )
    stream.end(pdfBuffer)
  })
}

export async function uploadInsurerLogo({
  fileBuffer,
  insurerSlug,
}: {
  fileBuffer: Buffer
  insurerSlug: string
}): Promise<UploadResult> {
  const publicId = `${FOLDER}/logos/${insurerSlug}`

  if (!isCloudinaryConfigured()) {
    return mockUploadResult(publicId, 'image/png')
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: 'image',
        overwrite: true,
        transformation: [{ width: 400, height: 200, crop: 'fit', quality: 'auto' }],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload failed'))
          return
        }
        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
          bytes: result.bytes,
          format: result.format,
        })
      }
    )
    stream.end(fileBuffer)
  })
}

export function getSignedUrl(publicId: string, expiresInSeconds = 3600): string {
  const expireAt = Math.floor(Date.now() / 1000) + expiresInSeconds
  return cloudinary.url(publicId, {
    resource_type: 'raw',
    sign_url: true,
    expires_at: expireAt,
    secure: true,
  })
}

export function deleteDocument(publicId: string): Promise<void> {
  return cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }).then(() => {})
}
