import {alpha, createTheme, Theme} from '@mui/material';

/**
 * "Felt and paper" palette (see `main.css`). MUI components use the same values as the CSS
 * variables so forms, dialogs and alerts share one visual language.
 */
export const Colors = {
    felt900: '#0B2F30',
    felt800: '#0F3A3B',
    felt700: '#154849',
    felt600: '#1E5958',
    brass400: '#F5C25A',
    brass500: '#EAA92B',
    brass700: '#9C6B14',
    paper: '#FAF6EC',
    paper2: '#F2ECDD',
    paperLine: '#E1D7C1',
    ink: '#172524',
    ink2: '#4D5C5A',
    chalk: '#EAF2EF',
    heart: '#E4524B',
    mint: '#7ED7B0',
} as const;

const FONT_BODY: string = '"Figtree Variable", system-ui, -apple-system, "Segoe UI", sans-serif';
const FONT_DISPLAY: string = '"Bricolage Grotesque Variable", "Figtree Variable", system-ui, sans-serif';

/** Main (dark, felt) theme. */
export const AppTheme: Theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {main: Colors.brass500, light: Colors.brass400, dark: Colors.brass700, contrastText: Colors.ink},
        secondary: {main: Colors.paper, contrastText: Colors.ink},
        error: {main: Colors.heart},
        success: {main: Colors.mint, contrastText: Colors.ink},
        warning: {main: Colors.brass400, contrastText: Colors.ink},
        background: {default: Colors.felt800, paper: Colors.felt700},
        text: {primary: Colors.chalk, secondary: alpha(Colors.chalk, 0.72)},
        divider: alpha(Colors.chalk, 0.12),
    },
    shape: {borderRadius: 12},
    typography: {
        fontFamily: FONT_BODY,
        h1: {fontFamily: FONT_DISPLAY, fontWeight: 800},
        h2: {fontFamily: FONT_DISPLAY, fontWeight: 800},
        h3: {fontFamily: FONT_DISPLAY, fontWeight: 750},
        h4: {fontFamily: FONT_DISPLAY, fontWeight: 750},
        h5: {fontFamily: FONT_DISPLAY, fontWeight: 700},
        h6: {fontFamily: FONT_DISPLAY, fontWeight: 700},
        button: {fontFamily: FONT_BODY, fontWeight: 700, textTransform: 'none', letterSpacing: 0},
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {backgroundColor: Colors.felt800},
            },
        },
        MuiButton: {
            defaultProps: {disableElevation: true},
            styleOverrides: {
                root: {
                    borderRadius: 999,
                    paddingInline: 20,
                    minHeight: 44,
                    fontSize: '0.975rem',
                    transition: 'transform 120ms ease, background-color 160ms ease, box-shadow 160ms ease',
                    '&:active': {transform: 'translateY(1px)'},
                },
                sizeLarge: {minHeight: 52, fontSize: '1.05rem', paddingInline: 28},
                sizeSmall: {minHeight: 34, paddingInline: 14, fontSize: '0.875rem'},
                containedPrimary: {
                    boxShadow: `0 1px 0 ${alpha('#fff', 0.45)} inset, 0 6px 16px -6px ${alpha(Colors.brass500, 0.7)}`,
                    '&:hover': {backgroundColor: Colors.brass400},
                    '&.Mui-disabled': {backgroundColor: alpha(Colors.chalk, 0.12), color: alpha(Colors.chalk, 0.4)},
                },
                outlined: {borderWidth: 1.5, '&:hover': {borderWidth: 1.5}},
            },
        },
        MuiIconButton: {
            styleOverrides: {root: {borderRadius: 12}},
        },
        MuiTextField: {
            defaultProps: {variant: 'outlined', fullWidth: true},
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    backgroundColor: alpha(Colors.chalk, 0.04),
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    backgroundColor: Colors.paper,
                    backgroundImage: 'none',
                    color: Colors.ink,
                    borderRadius: 22,
                },
            },
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    backgroundColor: Colors.ink,
                    color: Colors.paper,
                    fontSize: '0.8125rem',
                    borderRadius: 8,
                    padding: '6px 10px',
                },
                arrow: {color: Colors.ink},
            },
        },
        MuiSnackbar: {
            defaultProps: {anchorOrigin: {vertical: 'top', horizontal: 'center'}},
        },
        MuiAlert: {
            styleOverrides: {
                root: {
                    borderRadius: 14,
                    fontWeight: 600,
                    alignItems: 'center',
                    boxShadow: '0 18px 40px -12px rgba(3, 20, 20, 0.6)',
                },
                filledSuccess: {backgroundColor: Colors.mint, color: Colors.ink},
                filledWarning: {backgroundColor: Colors.brass400, color: Colors.ink},
                filledError: {backgroundColor: Colors.heart, color: '#fff'},
            },
        },
        MuiBackdrop: {
            styleOverrides: {root: {backgroundColor: alpha(Colors.felt900, 0.7), backdropFilter: 'blur(2px)'}},
        },
    },
});

/**
 * Light theme for paper surfaces (auth forms, dialogs, light panels).
 * Shares type and shape with the main theme; built from scratch so no dark-mode
 * palette values (action colors, dividers) leak into the light surfaces.
 */
export const PaperTheme: Theme = createTheme({
    shape: AppTheme.shape,
    typography: {
        fontFamily: FONT_BODY,
        h1: {fontFamily: FONT_DISPLAY, fontWeight: 800},
        h2: {fontFamily: FONT_DISPLAY, fontWeight: 800},
        h3: {fontFamily: FONT_DISPLAY, fontWeight: 750},
        button: {fontFamily: FONT_BODY, fontWeight: 700, textTransform: 'none', letterSpacing: 0},
    },
    palette: {
        mode: 'light',
        primary: {main: Colors.ink, light: Colors.ink2, dark: '#0c1515', contrastText: Colors.paper},
        secondary: {main: Colors.brass500, light: Colors.brass400, dark: Colors.brass700, contrastText: Colors.ink},
        error: {main: '#C2392F'},
        success: {main: '#2E8B66'},
        warning: {main: Colors.brass700},
        background: {default: Colors.paper, paper: Colors.paper},
        text: {primary: Colors.ink, secondary: Colors.ink2},
        divider: Colors.paperLine,
    },
    components: {
        MuiButton: {
            defaultProps: {disableElevation: true},
            styleOverrides: {
                root: {
                    borderRadius: 999,
                    paddingInline: 20,
                    minHeight: 44,
                    fontSize: '0.975rem',
                    transition: 'transform 120ms ease, background-color 160ms ease',
                    '&:active': {transform: 'translateY(1px)'},
                },
                sizeLarge: {minHeight: 52, fontSize: '1.05rem', paddingInline: 28},
                sizeSmall: {minHeight: 34, paddingInline: 14, fontSize: '0.875rem'},
                containedPrimary: {'&:hover': {backgroundColor: '#24403e'}},
                containedSecondary: {
                    boxShadow: `0 1px 0 ${alpha('#fff', 0.45)} inset`,
                    '&:hover': {backgroundColor: Colors.brass400},
                },
                outlined: {borderWidth: 1.5, '&:hover': {borderWidth: 1.5}},
            },
        },
        MuiIconButton: {
            styleOverrides: {root: {borderRadius: 999, color: Colors.ink}},
        },
        MuiTextField: {
            defaultProps: {variant: 'outlined', fullWidth: true},
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    backgroundColor: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': {borderColor: Colors.paperLine},
                    '&:hover .MuiOutlinedInput-notchedOutline': {borderColor: Colors.ink2},
                },
            },
        },
        MuiDialog: AppTheme.components?.MuiDialog,
        MuiTooltip: AppTheme.components?.MuiTooltip,
        MuiAlert: AppTheme.components?.MuiAlert,
        MuiSnackbar: AppTheme.components?.MuiSnackbar,
        MuiBackdrop: AppTheme.components?.MuiBackdrop,
    },
});
