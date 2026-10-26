"""
Domain exceptions for Tellwarden.
All exceptions provide user-safe, explanatory error messages.
"""

class TellwardenError(Exception):
    """Base exception for all Tellwarden operations."""
    pass

class ValidationError(TellwardenError):
    """Raised when URL syntax, schema, or input constraints fail."""
    pass

class BlockedTargetError(TellwardenError):
    """Raised by Network Guard when target resolves to non-public/restricted IP."""
    def __init__(self, message: str, address: str | None = None, category: str | None = None):
        super().__init__(message)
        self.address = address
        self.category = category

class ResolutionError(TellwardenError):
    """Raised when DNS resolution fails or times out."""
    pass

class RuleConfigError(TellwardenError):
    """Raised when YAML detection rules are missing, malformed, or out of bounds."""
    pass

class ScanBudgetExceededError(TellwardenError):
    """Raised when maximum request count or scan deadline is reached."""
    pass
