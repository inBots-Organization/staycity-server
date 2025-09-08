import { Schema } from 'mongoose';

function convertMongooseTypeToSwagger(schemaType: any): any {
  if (schemaType.type === String || schemaType === String) {
    const swagger: any = { type: 'string' };
    if (schemaType.enum) {
      swagger.enum = schemaType.enum;
    }
    if (schemaType.match && schemaType.match[0].toString().includes('@')) {
      swagger.format = 'email';
    }
    return swagger;
  }
  
  if (schemaType.type === Number || schemaType === Number) {
    return { type: 'number' };
  }
  
  if (schemaType.type === Boolean || schemaType === Boolean) {
    return { type: 'boolean' };
  }
  
  if (schemaType.type === Date || schemaType === Date) {
    return { type: 'string', format: 'date-time' };
  }
  
  if (schemaType.type === Array || Array.isArray(schemaType)) {
    return { type: 'array', items: { type: 'string' } };
  }
  
  return { type: 'string' };
}

export function generateSwaggerFromSchema(schema: Schema, name: string) {
  const paths = schema.paths;
  const properties: any = {};
  const required: string[] = [];
  
  // Add id field
  properties.id = {
    type: 'string',
    description: 'The auto-generated id of the document'
  };
  
  Object.keys(paths).forEach(path => {
    if (path === '_id' || path === '__v') return;
    
    const schemaType = paths[path];
    if (!schemaType) return;
    
    properties[path] = convertMongooseTypeToSwagger(schemaType);
    
    if (schemaType.isRequired) {
      required.push(path);
    }
  });
  
  // Handle timestamps
  if (schema.options.timestamps) {
    properties.createdAt = {
      type: 'string',
      format: 'date-time',
      description: 'When the document was created'
    };
    properties.updatedAt = {
      type: 'string',
      format: 'date-time', 
      description: 'When the document was last updated'
    };
  }
  
  const swaggerSchema = {
    type: 'object',
    required,
    properties
  };
  
  return {
    [name]: swaggerSchema
  };
}

export function generateCreateRequestSchema(schema: Schema, name: string) {
  const paths = schema.paths;
  const properties: any = {};
  const required: string[] = [];
  
  Object.keys(paths).forEach(path => {
    if (path === '_id' || path === '__v' || path === 'createdAt' || path === 'updatedAt') return;
    
    const schemaType = paths[path];
    if (!schemaType) return;
    
    properties[path] = convertMongooseTypeToSwagger(schemaType);
    
    if (schemaType.isRequired) {
      required.push(path);
    }
  });
  
  const swaggerSchema = {
    type: 'object',
    required,
    properties
  };
  
  return {
    [`Create${name}Request`]: swaggerSchema
  };
}