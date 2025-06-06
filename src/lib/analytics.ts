// Simple analytics tracking for user actions
// Can be extended later with Google Analytics, Mixpanel, etc.

interface AnalyticsEvent {
  action: string
  category: string
  label?: string
  value?: number
  userId?: string
  metadata?: Record<string, unknown>
}

class Analytics {
  private isEnabled: boolean = true
  private events: AnalyticsEvent[] = []

  // Track user actions
  track(event: AnalyticsEvent) {
    if (!this.isEnabled) return

    const enrichedEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    }

    this.events.push(enrichedEvent)
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics:', enrichedEvent)
    }

    // Send to analytics service (placeholder for future implementation)
    this.sendToAnalytics()
  }

  // Common tracking methods
  trackPageView(page: string, userId?: string) {
    this.track({
      action: 'page_view',
      category: 'navigation',
      label: page,
      userId
    })
  }

  trackUserAction(action: string, category: string, label?: string, userId?: string) {
    this.track({
      action,
      category,
      label,
      userId
    })
  }

  trackProjectAction(action: string, projectId?: string, userId?: string) {
    this.track({
      action,
      category: 'project',
      label: projectId,
      userId
    })
  }

  trackAIGeneration(type: 'prompt_suggestion' | 'image_generation', userId?: string, metadata?: Record<string, unknown>) {
    this.track({
      action: type,
      category: 'ai',
      userId,
      metadata
    })
  }

  trackExport(format: 'png' | 'pdf', creditsUsed: number, userId?: string) {
    this.track({
      action: 'export',
      category: 'export',
      label: format,
      value: creditsUsed,
      userId
    })
  }

  trackError(error: string, context?: string, userId?: string) {
    this.track({
      action: 'error',
      category: 'error',
      label: error,
      userId,
      metadata: { context }
    })
  }

  // Private method to send events (placeholder)
  private async sendToAnalytics() {
    // In the future, this could send to:
    // - Google Analytics
    // - Mixpanel
    // - Custom analytics endpoint
    // - PostHog
    // - etc.
    
    // For now, we'll just store locally and could batch send later
    try {
      // Could implement a queue system here
      // await fetch('/api/analytics', { method: 'POST', body: JSON.stringify(event) })
    } catch (error) {
      console.warn('Analytics tracking failed:', error)
    }
  }

  // Get analytics data (for debugging)
  getEvents() {
    return this.events
  }

  // Clear events (for privacy)
  clearEvents() {
    this.events = []
  }

  // Enable/disable tracking
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
  }
}

// Export singleton instance
export const analytics = new Analytics()

// Hook for React components
export function useAnalytics() {
  return analytics
}