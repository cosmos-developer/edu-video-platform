/**
 * Custom validators for the Interactive Learning Platform
 * Handles CUID format validation since database uses CUID instead of UUID
 */

import type { ValidationChain, CustomValidator } from 'express-validator';
import { param, body, query } from 'express-validator';

/**
 * CUID format validation
 * CUID pattern: starts with 'c' followed by 24 lowercase alphanumeric characters
 * Example: c123456789012345678901234
 */
const CUID_PATTERN = /^c[a-z0-9]{24}$/;

/**
 * Custom validator to check if value matches CUID format
 */
export const isCUID: CustomValidator = (value: string) => {
  if (!value || typeof value !== 'string') {
    throw new Error('Value must be a string');
  }
  
  if (!CUID_PATTERN.test(value)) {
    throw new Error('Invalid CUID format');
  }
  
  return true;
};

/**
 * Validation chain for CUID parameters
 */
export const validateCUIDParam = (paramName: string, message?: string): ValidationChain => {
  return param(paramName).custom(isCUID).withMessage(message || `Invalid ${paramName}`);
};

/**
 * Validation chain for CUID body fields
 */
export const validateCUIDBody = (fieldName: string, message?: string): ValidationChain => {
  return body(fieldName).custom(isCUID).withMessage(message || `Valid ${fieldName} is required`);
};

/**
 * Validation chain for optional CUID query parameters
 */
export const validateCUIDQuery = (queryName: string, message?: string): ValidationChain => {
  return query(queryName).optional().custom(isCUID).withMessage(message || `Invalid ${queryName}`);
};

/**
 * Helper function to validate CUID string directly
 * Useful for programmatic validation outside of express-validator
 */
export const isValidCUID = (value: string): boolean => {
  return typeof value === 'string' && CUID_PATTERN.test(value);
};