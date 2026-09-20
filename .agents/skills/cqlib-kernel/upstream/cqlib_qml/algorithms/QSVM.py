# cqlib_qml/algorithms/QSVM.py
"""
Quantum Support Vector Machine (QSVM).

This module implements a Quantum Support Vector Machine that uses quantum
kernel estimation with classical SVM. The quantum kernel is computed using
a parameterized quantum circuit that encodes classical data into quantum
states, and the kernel matrix is passed to a classical SVM classifier.

References:
    - Rebentrost, P., et al. (2014). "Quantum support vector machine for
      big data classification." Physical Review Letters, 113(13), 130503.
    - Havlíček, V., et al. (2019). "Supervised learning with quantum-enhanced
      feature spaces." Nature, 567(7747), 209-212.

Examples:
    >>> from cqlib_qml.algorithms.QSVM import QSVM
    >>> from cqlib_qml.encoder import ZZFeatureEncoder
    >>>
    >>> encoder = ZZFeatureEncoder(n_repeats=2, entanglement="linear")
    >>> qsvm = QSVM(encoder=encoder, C=1.0, swap_test=False)
    >>>
    >>> X_train = np.random.randn(100, 4)
    >>> y_train = np.random.randint(0, 2, 100)
    >>> qsvm.fit(X_train, y_train)
    >>>
    >>> X_test = np.random.randn(20, 4)
    >>> y_pred = qsvm.predict(X_test)
    >>> accuracy = qsvm.score(X_test, y_test)
"""

import numpy as np
from typing import Union
from sklearn.svm import SVC
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.utils.validation import check_X_y, check_array, check_is_fitted

from cqlib_qml.encoder import AmplitudeEncoder, AngleEncoder, ZZFeatureEncoder
from cqlib_qml.algorithms.QKM import QKM


class QSVM(BaseEstimator, ClassifierMixin):
    """
    Quantum Support Vector Machine (QSVM).

    Uses quantum kernel estimation with SVM for classification tasks.
    The quantum kernel is computed using the QKM class and passed to
    sklearn's SVC with precomputed kernel.

    Args:
        encoder: Encoding strategy for data-to-quantum state mapping.
            Must be one of AmplitudeEncoder, AngleEncoder, or ZZFeatureEncoder.
        C (float, optional): Regularization parameter for SVM.
            Defaults to 1.0.
        swap_test (bool, optional): Whether to use swap test for kernel computation.
            Defaults to False.
        probability (bool, optional): Whether to enable probability estimates.
            Defaults to False.
        **svm_kwargs: Additional arguments for sklearn.svm.SVC.

    Attributes:
        encoder: The encoding strategy instance.
        C: SVM regularization parameter.
        swap_test: Whether swap test is enabled.
        probability: Whether probability estimates are enabled.
        _qkm: Quantum Kernel Method instance.
        _svm: Trained SVM classifier.
        _X_fit: Training data used for fitting.
        classes_: Unique class labels.

    Raises:
        ValueError: If encoder type is not supported.

    Examples:
        >>> # Basic usage
        >>> qsvm = QSVM(encoder=AngleEncoder(), C=0.5)
        >>> qsvm.fit(X_train, y_train)
        >>> y_pred = qsvm.predict(X_test)
        >>>
        >>> # With probability estimates
        >>> qsvm = QSVM(encoder=ZZFeatureEncoder(), probability=True)
        >>> qsvm.fit(X_train, y_train)
        >>> y_proba = qsvm.predict_proba(X_test)
        >>>
        >>> # Custom SVM parameters
        >>> qsvm = QSVM(encoder=AmplitudeEncoder(), gamma='auto', class_weight='balanced')
    """

    @property
    def n_support_(self) -> np.ndarray:
        """Number of support vectors for each class."""
        check_is_fitted(self, "_svm")
        return self._svm.n_support_

    @property
    def support_vectors_(self) -> np.ndarray:
        """Support vectors in original feature space."""
        check_is_fitted(self, "_svm")
        if self._X_fit is not None:
            return self._X_fit[self._svm.support_]
        return None

    @property
    def dual_coef_(self) -> np.ndarray:
        """Dual coefficients of the SVM."""
        check_is_fitted(self, "_svm")
        return self._svm.dual_coef_

    def __init__(
        self,
        encoder: Union[AmplitudeEncoder, AngleEncoder, ZZFeatureEncoder],
        C: float = 1.0,
        swap_test: bool = False,
        probability: bool = False,
        **svm_kwargs,
    ):
        """Initialize the QSVM model."""
        if not isinstance(encoder, (AmplitudeEncoder, AngleEncoder, ZZFeatureEncoder)):
            raise ValueError(
                f"QSVM only supports AmplitudeEncoder, AngleEncoder and ZZFeatureEncoder. "
                f"Got {type(encoder).__name__}."
            )
        self.encoder = encoder
        self.C = C
        self.swap_test = swap_test
        self.probability = probability
        self.svm_kwargs = svm_kwargs
        self._qkm = None
        self._svm = None
        self._X_fit = None

    def _get_qkm(self) -> QKM:
        """
        Get or create QKM instance.

        Returns:
            QKM: The Quantum Kernel Method instance.
        """
        if self._qkm is None:
            self._qkm = QKM(
                encoder=self.encoder,
                swap_test=self.swap_test,
            )
        return self._qkm

    def fit(self, X: np.ndarray, y: np.ndarray, **kwargs) -> "QSVM":
        """
        Fit the QSVM model to the training data.

        This method computes the quantum kernel matrix from the training data
        and fits a classical SVM using the precomputed kernel.

        Args:
            X (np.ndarray): Training data of shape (n_samples, n_features).
            y (np.ndarray): Target labels of shape (n_samples,).

        Returns:
            QSVM: The fitted QSVM instance.

        Raises:
            ValueError: If input validation fails.

        Examples:
            >>> X = np.random.randn(100, 5)
            >>> y = np.random.randint(0, 2, 100)
            >>> qsvm.fit(X, y)
        """
        X, y = check_X_y(X, y)

        # Compute quantum kernel matrix
        qkm = self._get_qkm()
        K_train = qkm.kernel(X)

        # Initialize and train SVM with precomputed kernel
        self._svm = SVC(kernel="precomputed", C=self.C, probability=self.probability, **self.svm_kwargs)
        self._svm.fit(K_train, y)

        self._X_fit = X
        self.classes_ = self._svm.classes_

        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Predict class labels for samples in X.

        Args:
            X (np.ndarray): Test data of shape (n_samples, n_features).

        Returns:
            np.ndarray: Predicted labels of shape (n_samples,).

        Raises:
            sklearn.exceptions.NotFittedError: If model has not been fitted.

        Examples:
            >>> y_pred = qsvm.predict(X_test)
        """
        check_is_fitted(self, "_svm")
        X = check_array(X)

        qkm = self._get_qkm()
        K_test = qkm.kernel(X, self._X_fit)

        return self._svm.predict(K_test)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Predict class probabilities for samples in X.

        Args:
            X (np.ndarray): Test data of shape (n_samples, n_features).

        Returns:
            np.ndarray: Probability estimates of shape (n_samples, n_classes).

        Raises:
            RuntimeError: If probability was not set to True during initialization.

        Examples:
            >>> qsvm = QSVM(encoder=encoder, probability=True)
            >>> qsvm.fit(X_train, y_train)
            >>> y_proba = qsvm.predict_proba(X_test)
        """
        check_is_fitted(self, "_svm")
        X = check_array(X)

        if not self.probability:
            raise RuntimeError("Probability estimates not available. " "Set probability=True when initializing QSVM.")

        qkm = self._get_qkm()
        K_test = qkm.kernel(X, self._X_fit)

        return self._svm.predict_proba(K_test)

    def decision_function(self, X: np.ndarray) -> np.ndarray:
        """
        Compute the decision function for samples in X.

        Args:
            X (np.ndarray): Test data of shape (n_samples, n_features).

        Returns:
            np.ndarray: Decision function values.

        Examples:
            >>> scores = qsvm.decision_function(X_test)
        """
        check_is_fitted(self, "_svm")
        X = check_array(X)

        qkm = self._get_qkm()
        K_test = qkm.kernel(X, self._X_fit)

        return self._svm.decision_function(K_test)

    def score(self, X: np.ndarray, y: np.ndarray) -> float:
        """
        Return the mean accuracy on the given test data and labels.

        Args:
            X (np.ndarray): Test data of shape (n_samples, n_features).
            y (np.ndarray): True labels of shape (n_samples,).

        Returns:
            float: Mean accuracy on the test data.

        Examples:
            >>> accuracy = qsvm.score(X_test, y_test)
        """
        from sklearn.metrics import accuracy_score

        return accuracy_score(y, self.predict(X))

    def clear_cache(self):
        """
        Clear the QKM circuit cache to free memory.

        Examples:
            >>> qsvm.clear_cache()  # Free cached circuits after training
        """
        if self._qkm is not None:
            self._qkm.clear_cache()

    def reset(self):
        """
        Reset the QSVM state.

        This clears the QKM instance, SVM classifier, and stored training data.
        Use this when you want to retrain with different parameters.

        Examples:
            >>> qsvm.reset()
            >>> qsvm.set_params(C=0.1)
            >>> qsvm.fit(X_train, y_train)
        """
        self._qkm = None
        self._svm = None
        self._X_fit = None
