import { z } from 'zod';

export class SecurityValidator {
  /**
   * Sanitizes strings to prevent basic HTML/Script injection.
   */
  public static sanitizeString(input: string): string {
    return input
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '') // Remove script tags
      .replace(/<\/?[^>]+(>|$)/g, '') // Remove HTML tags
      .trim();
  }

  /**
   * Validates if a date string is a valid YYYY-MM-DD date and not in the future.
   */
  public static validatePeriodDate(dateStr: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;

    const now = new Date();
    // Allow up to today
    return date <= now;
  }

  /**
   * Scans text content for suspicious malicious patterns (SQLi or Javascript injection).
   */
  public static containsMaliciousPatterns(content: string): boolean {
    const patterns = [
      /<script>/i,
      /javascript:/i,
      /onerror=/i,
      /onload=/i,
      /eval\(/i,
      /UNION SELECT/i,
      /DROP TABLE/i,
      /--/ // SQL comment
    ];
    return patterns.some(pattern => pattern.test(content));
  }

  /**
   * Strict validation for patient names and records to avoid path traversals or terminal escape codes.
   */
  public static sanitizeFileName(name: string): string {
    // Keep only alphanumeric, hyphens, underscores, dots, and spaces
    return name.replace(/[^a-zA-Z0-9_\-\.\s]/g, '').trim();
  }
}
