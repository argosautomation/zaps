import InspectorTool from '@/components/dashboard/InspectorTool'

export const metadata = {
    title: 'PII Inspector - Zaps.ai',
    description: 'Test PII redaction capabilities',
}

export default function InspectorPage() {
    return (
        <div className="h-[calc(100vh-4rem)] p-4 lg:p-8">
            <InspectorTool />
        </div>
    )
}
