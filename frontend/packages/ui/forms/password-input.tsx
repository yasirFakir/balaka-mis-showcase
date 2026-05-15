import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "../lib/utils"
import { Input } from "./input"
import { useFormField } from "./form"

const PasswordInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    
    // Attempt to hook into the FormField context to wire up IDs and ARIA attributes
    // This allows PasswordInput to replace <FormControl><Input /></FormControl>
    let formProps = {}
    try {
        // We use the hook. If we are not in a FormField, this might fail or return partial data
        // depending on implementation. Ideally, this component is used within FormField.
        const { error, formItemId, formDescriptionId, formMessageId } = useFormField()
        formProps = {
            id: formItemId,
            "aria-describedby": !error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`,
            "aria-invalid": !!error
        }
    } catch (e) {
        // Use without form context
    }

    return (
      <div className="relative w-full">
        <Input
          type={showPassword ? "text" : "password"}
          className={cn("pr-10", className)}
          ref={ref}
          {...formProps}
          {...props}
        />
        <button
          type="button"
          className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground/50 hover:text-foreground transition-colors"
          onClick={() => setShowPassword((prev) => !prev)}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
        </button>
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
