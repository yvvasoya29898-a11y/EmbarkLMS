import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToStream, Svg, Path, Circle, Polygon, G } from '@react-pdf/renderer'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Landscape certificate design styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#fbfbfa', // Warm premium ivory background
    fontFamily: 'Helvetica',
    height: '100%',
    position: 'relative'
  },
  outerBorder: {
    height: '100%',
    borderWidth: 4,
    borderStyle: 'solid',
    borderColor: '#0f172a', // Deep corporate navy
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 35,
    position: 'relative'
  },
  innerBorder: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#c5a880', // Gold accent
    opacity: 0.8
  },
  // Decorative gold corner brackets
  cornerTL: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 24,
    height: 24,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: '#c5a880'
  },
  cornerTR: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: '#c5a880'
  },
  cornerBL: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 24,
    height: 24,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#c5a880'
  },
  cornerBR: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#c5a880'
  },
  headerContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 10
  },
  branding: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#c5a880', // Premium Gold
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 6
  },
  title: {
    fontSize: 28,
    fontFamily: 'Times-Roman',
    fontWeight: 'bold',
    color: '#0f172a',
    letterSpacing: 1.5,
    marginTop: 2,
    textTransform: 'uppercase'
  },
  subtitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Oblique',
    color: '#64748b',
    letterSpacing: 1.5,
    marginTop: 4,
    textTransform: 'uppercase'
  },
  contentContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginVertical: 15
  },
  recipientLabel: {
    fontSize: 10,
    fontFamily: 'Times-Italic',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 2
  },
  recipientName: {
    fontSize: 32,
    fontFamily: 'Times-BoldItalic',
    color: '#0f172a',
    textAlign: 'center',
    marginVertical: 4,
    letterSpacing: 0.5
  },
  goldLine: {
    width: 180,
    height: 1,
    backgroundColor: '#c5a880',
    marginVertical: 8,
    opacity: 0.7
  },
  completionText: {
    fontSize: 9.5,
    color: '#475569',
    textAlign: 'center',
    maxWidth: 480,
    lineHeight: 1.6,
    marginHorizontal: 60,
    marginBottom: 8
  },
  courseTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.5
  },
  sealContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4
  },
  footer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    marginTop: 10
  },
  footerCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '28%'
  },
  footerLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#cbd5e1',
    marginBottom: 6
  },
  footerLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2
  },
  footerValue: {
    fontSize: 8.5,
    color: '#334155',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center'
  },
  signatureText: {
    fontFamily: 'Times-BoldItalic',
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 1
  },
  verifyLink: {
    fontSize: 6,
    color: '#0284c7',
    marginTop: 2,
    fontFamily: 'Helvetica-Oblique'
  }
})

const AcademicLogoSvg = () => (
  <Svg viewBox="0 0 100 100" style={{ width: 44, height: 44, alignSelf: 'center', marginBottom: 4 }}>
    <G fill="none" stroke="#c5a880" strokeWidth="1.5" strokeLinecap="round">
      {/* Laurel Wreaths */}
      <Path d="M 35,72 C 22,63 22,40 31,27 M 25,62 C 19,53 21,43 28,34" />
      <Path d="M 35,72 L 31,69 M 31,62 L 27,59 M 29,52 L 25,49 M 30,42 L 26,39 M 32,32 L 28,29" strokeWidth="2" />
      <Path d="M 65,72 C 78,63 78,40 69,27 M 75,62 C 81,53 79,43 72,34" />
      <Path d="M 65,72 L 69,69 M 69,62 L 73,59 M 71,52 L 75,49 M 70,42 L 74,39 M 68,32 L 72,29" strokeWidth="2" />
      
      {/* Shield */}
      <Path d="M 40,28 L 60,28 C 60,28 61.5,45 60,58 C 58.5,68 50,73 50,73 C 50,73 41.5,68 40,58 C 38.5,45 40,28 40,28 Z" strokeWidth="2" fill="#0f172a" />
      <Path d="M 43,31 L 57,31 C 57,31 58.2,45 57,56 C 55.8,65 50,70 50,70 C 50,70 44.2,65 43,56 C 41.8,45 43,31 43,31 Z" strokeWidth="1" />
      
      {/* Letter 'E' */}
      <Path d="M 46,39 L 54,39 M 46,45 L 52,45 M 46,51 L 54,51 M 46,39 L 46,51" strokeWidth="2" stroke="#c5a880" />
    </G>
  </Svg>
)

const SignatureSvg = () => (
  <Svg viewBox="0 0 150 45" style={{ width: 84, height: 22, alignSelf: 'center', marginBottom: 2 }}>
    <Path
      d="M10,28 Q22,8 28,15 T35,32 T45,18 T55,28 T68,12 T75,30 T85,15 T95,25 T105,10 T115,28 T125,18 T135,22 M25,20 L55,20"
      fill="none"
      stroke="#1e40af"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

const GoldSealSvg = () => (
  <Svg viewBox="0 0 80 80" style={{ width: 44, height: 44, alignSelf: 'center' }}>
    <Path
      d="M 40,10 L 42,13 L 45,11 L 46,14 L 49,13 L 50,16 L 53,15 L 54,18 L 57,17 L 57,20 L 60,19 L 60,22 L 63,22 L 62,25 L 65,25 L 64,28 L 66,29 L 65,32 L 67,33 L 65,36 L 66,38 L 64,40 L 66,42 L 64,44 L 65,47 L 63,48 L 64,51 L 62,52 L 63,55 L 60,55 L 60,58 L 57,57 L 57,60 L 54,59 L 53,62 L 50,61 L 49,64 L 46,63 L 45,66 L 42,64 L 40,67 L 38,64 L 35,66 L 34,63 L 31,64 L 30,61 L 27,62 L 26,59 L 23,60 L 23,57 L 20,58 L 20,55 L 17,55 L 18,52 L 15,51 L 17,48 L 15,47 L 16,44 L 14,42 L 16,40 L 14,38 L 15,36 L 13,33 L 15,32 L 14,29 L 16,28 L 15,25 L 18,25 L 17,22 L 20,22 L 20,19 L 23,20 L 23,17 L 26,18 T 30,16 L 31,13 L 34,14 L 35,11 L 38,13 Z"
      fill="#d4af37"
      stroke="#c5a880"
      strokeWidth="1"
    />
    <Circle cx="40" cy="40" r="23" fill="#c5a880" stroke="#b8860b" strokeWidth="1" />
    <Circle cx="40" cy="40" r="20" fill="none" stroke="#ffffff" strokeWidth="0.8" strokeDasharray="3,2" opacity="0.6" />
    <Polygon points="40,30 43,36 49,36 44,40 46,46 40,42 34,46 36,40 31,36 37,36" fill="#ffffff" />
  </Svg>
)

// Certificate document component
const CertificateDocument = ({
  studentName,
  courseTitle,
  issueDate,
  verifyCode,
  verifyUrl
}: {
  studentName: string
  courseTitle: string
  issueDate: string
  verifyCode: string
  verifyUrl: string
}) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      {/* Outer Navy Border */}
      <View style={styles.outerBorder}>
        {/* Inner Gold Border */}
        <View style={styles.innerBorder} />
        
        {/* Corner Brackets */}
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />

        {/* Header Section */}
        <View style={styles.headerContainer}>
          <AcademicLogoSvg />
          <Text style={styles.branding}>Embark AI Institute</Text>
          <Text style={styles.title}>Certificate of Completion</Text>
          <Text style={styles.subtitle}>In Recognition of Academic & Practical Excellence</Text>
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          <Text style={styles.recipientLabel}>This is proudly presented to</Text>
          <Text style={styles.recipientName}>{studentName}</Text>
          <View style={styles.goldLine} />
          <Text style={styles.completionText}>
            for successfully meeting all graduation requirements, completing assignments, and demonstrating core competencies in the professional syllabus of:
          </Text>
          <Text style={styles.courseTitle}>{courseTitle}</Text>
        </View>

        {/* Gold Seal Graphic */}
        <View style={styles.sealContainer}>
          <GoldSealSvg />
        </View>

        {/* Footer Section */}
        <View style={styles.footer}>
          <View style={styles.footerCol}>
            <View style={styles.footerLine} />
            <Text style={styles.footerLabel}>Date of Issue</Text>
            <Text style={styles.footerValue}>{issueDate}</Text>
          </View>

          <View style={styles.footerCol}>
            <View style={styles.footerLine} />
            <Text style={styles.footerLabel}>Verification Code</Text>
            <Text style={styles.footerValue}>{verifyCode.slice(0, 18)}...</Text>
            <Text style={styles.verifyLink}>{verifyUrl}</Text>
          </View>

          <View style={styles.footerCol}>
            <SignatureSvg />
            <View style={styles.footerLine} />
            <Text style={styles.footerLabel}>Authorized Signature</Text>
            <Text style={styles.footerValue}>Yogi Vasoya</Text>
            <Text style={{ fontSize: 6.5, color: '#64748b', textAlign: 'center', marginTop: 1.5, fontFamily: 'Helvetica' }}>Founder, Embark AI</Text>
          </View>
        </View>
      </View>
    </Page>
  </Document>
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // 2. Fetch certificate details
  const { data: cert, error: certError } = await supabase
    .from('certificates')
    .select('id, user_id, course_id, verify_code, issued_at')
    .eq('id', id)
    .single()

  if (certError || !cert) {
    return new NextResponse('Certificate not found', { status: 404 })
  }

  // 3. Verify owner or admin permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const isOwner = cert.user_id === user.id

  if (!isOwner && !isAdmin) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // 4. Fetch certificate student profile details & course details
  const { data: studentProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', cert.user_id)
    .single()

  const { data: course } = await supabase
    .from('courses')
    .select('title')
    .eq('id', cert.course_id)
    .single()

  // 5. Render PDF to stream
  const stream = await renderToStream(
    <CertificateDocument
      studentName={studentProfile?.full_name || 'Student'}
      courseTitle={course?.title || 'Professional AI Course'}
      issueDate={new Date(cert.issued_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}
      verifyCode={cert.verify_code}
      verifyUrl={`embarkai.in/verify/${cert.verify_code}`}
    />
  )

  // 6. Convert Stream to Buffer to output
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }
  const pdfBuffer = Buffer.concat(chunks)

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="certificate-${id}.pdf"`,
      'Content-Length': pdfBuffer.length.toString()
    }
  })
}
