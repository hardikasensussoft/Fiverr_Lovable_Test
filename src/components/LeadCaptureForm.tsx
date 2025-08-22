import { useState, useEffect } from 'react';
import { Mail, User, CheckCircle, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { validateLeadForm, ValidationError, validateName, validateEmail } from '@/lib/validation';
import { supabase } from '@/integrations/supabase/client';
import { useLeadStore } from '@/lib/lead-store';
import { toast } from 'sonner';

export const LeadCaptureForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', industry: '' });
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [fieldStates, setFieldStates] = useState({
    name: { touched: false, valid: false },
    email: { touched: false, valid: false },
    industry: { touched: false, valid: false }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { submitted, setSubmitted, addLead, sessionLeads } = useLeadStore();

  useEffect(() => {
    setSubmitted(false);
  }, [setSubmitted]);

  const getFieldError = (field: string) => {
    return validationErrors.find(error => error.field === field)?.message;
  };

  const getFieldState = (field: string) => {
    const fieldState = fieldStates[field as keyof typeof fieldStates];
    const hasError = getFieldError(field);
    const hasValue = formData[field as keyof typeof formData].trim().length > 0;
    
    if (hasError) return 'error';
    if (fieldState.touched && hasValue && !hasError) return 'success';
    if (fieldState.touched && !hasValue) return 'error';
    return 'default';
  };

  const validateField = (field: string, value: string) => {
    let isValid = false;
    let errorMessage = '';

    switch (field) {
      case 'name':
        if (!value.trim()) {
          errorMessage = 'Name is required';
        } else if (!validateName(value)) {
          errorMessage = 'Name must be at least 2 characters';
        } else {
          isValid = true;
        }
        break;
      case 'email':
        if (!value.trim()) {
          errorMessage = 'Email is required';
        } else if (!validateEmail(value)) {
          errorMessage = 'Please enter a valid email address';
        } else {
          isValid = true;
        }
        break;
      case 'industry':
        if (!value.trim()) {
          errorMessage = 'Please select your industry';
        } else {
          isValid = true;
        }
        break;
    }

    return { isValid, errorMessage };
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Mark field as touched
    setFieldStates(prev => ({
      ...prev,
      [field]: { ...prev[field as keyof typeof prev], touched: true }
    }));

    // Real-time validation
    const { isValid, errorMessage } = validateField(field, value);
    
    if (isValid) {
      // Remove error for this field
      setValidationErrors(prev => prev.filter(error => error.field !== field));
    } else if (errorMessage) {
      // Update or add error for this field
      setValidationErrors(prev => {
        const existing = prev.find(error => error.field === field);
        if (existing) {
          return prev.map(error => 
            error.field === field ? { ...error, message: errorMessage } : error
          );
        } else {
          return [...prev, { field, message: errorMessage }];
        }
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched for validation
    setFieldStates({
      name: { touched: true, valid: false },
      email: { touched: true, valid: false },
      industry: { touched: true, valid: false }
    });

    const errors = validateLeadForm(formData);
    setValidationErrors(errors);

    if (errors.length === 0) {
      setIsSubmitting(true);
      
      try {
        // Send confirmation email
        const { error: emailError } = await supabase.functions.invoke('send-confirmation', {
          body: {
            name: formData.name,
            email: formData.email,
            industry: formData.industry,
          },
        });

        if (emailError) {
          console.error('Error sending confirmation email:', emailError);
          
          // Show error toast
          toast.error('Failed to send confirmation email', {
            description: 'Please try again or contact support if the problem persists.',
            duration: 5000,
          });
          
          return; // Don't proceed with success flow
        }

        console.log('Confirmation email sent successfully');

        const lead = {
          name: formData.name,
          email: formData.email,
          industry: formData.industry,
          submitted_at: new Date().toISOString(), 
        };
        
        // Add lead to the store instead of local state
        addLead(lead);
        
        // Show success toast
        toast.success('Welcome to the Innovation Community! 🚀', {
          description: `Hi ${formData.name}! We've sent a personalized welcome email to ${formData.email}. Check your inbox for exclusive insights about the ${formData.industry} industry.`,
          duration: 6000,
        });
        
        setSubmitted(true);
        setFormData({ name: '', email: '', industry: '' });
        setValidationErrors([]);
        setFieldStates({
          name: { touched: false, valid: false },
          email: { touched: false, valid: false },
          industry: { touched: false, valid: false }
        });
      } catch (error) {
        console.error('Error submitting form:', error);
        
        // Show error toast for unexpected errors
        toast.error('Something went wrong', {
          description: 'An unexpected error occurred. Please try again or contact support.',
          duration: 5000,
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Show validation error toast
      toast.error('Please fix the form errors', {
        description: `Please correct the ${errors.length} error${errors.length > 1 ? 's' : ''} above and try again.`,
        duration: 4000,
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', industry: '' });
    setValidationErrors([]);
    setFieldStates({
      name: { touched: false, valid: false },
      email: { touched: false, valid: false },
      industry: { touched: false, valid: false }
    });
    setSubmitted(false);
  };

  const getInputClassName = (field: string) => {
    const state = getFieldState(field);
    const baseClasses = "pl-10 h-12 bg-input border-border text-foreground placeholder:text-muted-foreground transition-smooth";
    
    switch (state) {
      case 'error':
        return `${baseClasses} border-destructive focus:border-destructive focus:shadow-[0_0_0_2px_hsl(0_84%_60%/0.2)]`;
      case 'success':
        return `${baseClasses} border-green-500 focus:border-green-500 focus:shadow-[0_0_0_2px_hsl(142_76%_36%/0.2)]`;
      default:
        return `${baseClasses} focus:border-accent focus:shadow-glow`;
    }
  };

  const renderFieldIcon = (field: string) => {
    const state = getFieldState(field);
    
    switch (state) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      default:
        return null;
    }
  };

  if (submitted) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-gradient-card p-8 rounded-2xl shadow-card border border-border backdrop-blur-sm animate-slide-up text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto shadow-glow animate-glow">
              <CheckCircle className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-foreground mb-3">Welcome aboard! 🎉</h2>

          <p className="text-muted-foreground mb-2">
            Thanks for joining! We'll be in touch soon with updates.
          </p>

          <p className="text-sm text-accent mb-8">
            You're #{sessionLeads.length} in this session
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
              <p className="text-sm text-foreground">
                💡 <strong>What's next?</strong>
                <br />
                We'll send you exclusive updates, early access, and behind-the-scenes content as we
                build something amazing.
              </p>
            </div>

            <Button
              onClick={resetForm}
              variant="outline"
              className="w-full border-border hover:bg-accent/10 transition-smooth group"
            >
              Submit Another Lead
              <User className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Follow our journey on social media for real-time updates
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-gradient-card p-8 rounded-2xl shadow-card border border-border backdrop-blur-sm animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Mail className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Join Our Community</h2>
          <p className="text-muted-foreground">Be the first to know when we launch</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-foreground">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={getInputClassName('name')}
                aria-describedby={getFieldError('name') ? 'name-error' : undefined}
                aria-invalid={getFieldState('name') === 'error'}
              />
              {renderFieldIcon('name') && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {renderFieldIcon('name')}
                </div>
              )}
            </div>
            {getFieldError('name') && (
              <p id="name-error" className="text-destructive text-sm animate-fade-in flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {getFieldError('name')}
              </p>
            )}
            {fieldStates.name.touched && formData.name.length > 0 && !getFieldError('name') && (
              <p className="text-green-600 text-sm animate-fade-in flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Name looks good!
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={getInputClassName('email')}
                aria-describedby={getFieldError('email') ? 'email-error' : undefined}
                aria-invalid={getFieldState('email') === 'error'}
              />
              {renderFieldIcon('email') && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {renderFieldIcon('email')}
                </div>
              )}
            </div>
            {getFieldError('email') && (
              <p id="email-error" className="text-destructive text-sm animate-fade-in flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {getFieldError('email')}
              </p>
            )}
            {fieldStates.email.touched && formData.email.length > 0 && !getFieldError('email') && (
              <p className="text-green-600 text-sm animate-fade-in flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Email looks good!
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="industry" className="text-sm font-medium text-foreground">
              Industry *
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
              <Select value={formData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                <SelectTrigger 
                  id="industry"
                  className={getInputClassName('industry')}
                  aria-describedby={getFieldError('industry') ? 'industry-error' : undefined}
                  aria-invalid={getFieldState('industry') === 'error'}
                >
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="retail">Retail & E-commerce</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="consulting">Consulting</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {renderFieldIcon('industry') && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {renderFieldIcon('industry')}
                </div>
              )}
            </div>
            {getFieldError('industry') && (
              <p id="industry-error" className="text-destructive text-sm animate-fade-in flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {getFieldError('industry')}
              </p>
            )}
            {fieldStates.industry.touched && formData.industry.length > 0 && !getFieldError('industry') && (
              <p className="text-green-600 text-sm animate-fade-in flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Industry selected!
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || validationErrors.length > 0}
            className="w-full h-12 bg-gradient-primary text-primary-foreground font-semibold rounded-lg shadow-glow hover:shadow-[0_0_60px_hsl(210_100%_60%/0.3)] transition-smooth transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Get Early Access
              </>
            )}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          By submitting, you agree to receive updates. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
};
