import numpy as np
from numpy import linalg

print("Autograder loaded!")

def test_q1(func):
    A = np.array([[4, 2], [1, 3]])
    expected = np.sort(linalg.eigvals(A))
    result = np.sort(func(A))
    assert np.allclose(result, expected), "Question 1 Failed!"
    print("Question 1 Passed!")

def test_q2(func):
    A = np.array(range(25)).reshape([5,5])
    expected = A[1::2, ::2]
    result = func(A)
    assert np.array_equal(result, expected), "Question 2 Failed!"
    print("Question 2 Passed!")

def test_q3(func):
    A = np.array([[5, 1, 3, 2],
                  [1, 4, 2, 3],
                  [3, 2, 1, 4]])
    expected = np.min(np.argmin(A, axis=0))
    result = func(A)
    assert result == expected, "Question 3 Failed!"
    print("Question 3 Passed!")

def test_q4(func):
    A = np.array([[1,2,3],[4,5,6],[7,8,9],[10,11,12]])
    B = np.array([[1,1,1],[2,2,2]])
    expected = np.concatenate([B, A[::2,:]], axis=0)
    result = func(A, B)
    assert np.array_equal(result, expected), "Question 4 Failed!"
    print("Question 4 Passed!")

def test_q5(func):
    N = 5
    u = np.arange(N, 0, -1)
    v = np.arange(1, N+1)
    expected = u * v
    result = func(N)
    assert np.array_equal(result, expected), "Question 5 Failed!"
    print("Question 5 Passed!")

def test_q6(func):
    v = np.array([1,2,3,4,5,6])
    expected = np.flip(v)
    result = func(v)
    assert np.array_equal(result, expected), "Question 6 Failed!"
    print("Question 6 Passed!")

def test_q7(func):
    A = np.array([[1,2,3],[4,5,6],[7,8,9]])
    expected = np.diag(np.fliplr(A))
    result = func(A)
    assert np.array_equal(result, expected), "Question 7 Failed!"
    print("Question 7 Passed!")

def test_q8(func):
    A = np.array([[1,2,3],[4,5,6],[7,8,9]])
    expected = np.sort(np.sum(A, axis=0))
    result = func(A)
    assert np.array_equal(result, expected), "Question 8 Failed!"
    print("Question 8 Passed!")

def test_q9(func):
    A = np.array([[1.,2.,3.],[4.,5.,6.]])
    B = np.array([[1.,2.],[3.,4.]])
    A_norm = A / A.sum(axis=1, keepdims=True)
    B_norm = B / B.sum(axis=0, keepdims=True)
    result_A, result_B = func(A, B)
    assert np.allclose(result_A, A_norm), "Question 9 Failed (A normalization)!"
    assert np.allclose(result_B, B_norm), "Question 9 Failed (B normalization)!"
    print("Question 9 Passed!")

def test_q10(func):
    A = np.array([[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16]])
    r1, r2, c1, c2 = 1, 3, 0, 2
    expected = A[r1:r2, c1:c2].T
    result = func(A, r1, r2, c1, c2)
    assert np.array_equal(result, expected), "Question 10 Failed!"
    print("Question 10 Passed!")

def test_all(q1,q2,q3,q4,q5,q6,q7,q8,q9,q10):
    test_q1(q1)
    test_q2(q2)
    test_q3(q3)
    test_q4(q4)
    test_q5(q5)
    test_q6(q6)
    test_q7(q7)
    test_q8(q8)
    test_q9(q9)
    test_q10(q10)
